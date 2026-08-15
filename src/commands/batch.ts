import { readFile } from "node:fs/promises";
import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface BatchSubmission {
  batch_id: string;
  [key: string]: unknown;
}

/**
 * Submit a batch of workflows from a JSON file.
 * The file should contain the batch payload accepted by the Comfy Cloud
 * `submit_batch` MCP tool. Returns a `batch_id` to track status with
 * `job batch <batch_id>` and retrieve output with `batch output <batch_id>`.
 */
export async function submitBatch(filePath: string): Promise<BatchSubmission> {
  const client = await getMcpClient();
  const raw = await readFile(filePath, "utf-8");
  const batch = JSON.parse(raw);

  const result = (await client.callTool("submit_batch", { batch })) as {
    content?: McpContentPart[];
  };

  const parsed = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (parsed?.batch_id) {
    return parsed as BatchSubmission;
  }

  const text = result.content?.[0]?.text;
  if (text) {
    try {
      const obj = JSON.parse(text) as BatchSubmission;
      if (obj.batch_id) return obj;
    } catch {
      return { batch_id: text };
    }
  }

  throw new Error("No batch_id returned from batch submission");
}

/**
 * Retrieve output for a completed batch job.
 */
export async function getBatchOutput(
  batchId: string,
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_batch_output", {
    batch_id: batchId,
  })) as { content?: McpContentPart[] };

  const parsed = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (parsed !== undefined) {
    return parsed as Record<string, unknown>;
  }

  const text = result.content?.[result.content.length - 1]?.text;
  if (text) return { output: text };

  return { error: "No batch output returned" };
}

/**
 * Block until every job in a batch reaches a terminal state.
 * If the server times out (~25s) it returns `{timed_out: true}` — call again
 * until all jobs are terminal, then use `batch output` to retrieve results.
 */
export async function waitForBatch(
  batchId: string,
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("wait_for_batch", {
    batch_id: batchId,
  })) as { content?: McpContentPart[] };

  const parsed = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (parsed !== undefined) return parsed as Record<string, unknown>;

  const text = result.content?.[result.content.length - 1]?.text;
  if (text) return { result: text };

  return { error: "No wait_for_batch response returned" };
}
