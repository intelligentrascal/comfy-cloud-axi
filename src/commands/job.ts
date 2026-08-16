import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface JobStatus {
  prompt_id: string;
  status?: string;
  ready?: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function getJobStatus(promptId: string): Promise<JobStatus> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_job_status", {
    prompt_id: promptId,
  })) as { content?: McpContentPart[] };

  const parsed = parseJsonFromContent(result.content);
  if (parsed !== undefined) {
    return parsed as JobStatus;
  }

  const raw = result.content?.[result.content.length - 1]?.text;
  if (raw) {
    return { prompt_id: promptId, raw };
  }

  throw new Error("No job status returned — upstream returned an empty payload");
}

export async function getBatchStatus(
  batchId: string
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_batch_status", {
    batch_id: batchId,
  })) as { content?: McpContentPart[] };

  const parsed = parseJsonFromContent(result.content);
  if (parsed !== undefined) {
    return parsed as Record<string, unknown>;
  }

  const raw = result.content?.[result.content.length - 1]?.text;
  if (raw) {
    return { batch_id: batchId, raw };
  }

  throw new Error("No batch status returned — upstream returned an empty payload");
}

/**
 * Block until a job is complete by calling the `wait_for_job` MCP tool.
 * Returns the final job status — `ready: true` when the job succeeded.
 * Prefer this over polling `job status` in a loop; the server handles the wait.
 */
export async function waitForJob(promptId: string): Promise<JobStatus> {
  const client = await getMcpClient();
  const result = (await client.callTool("wait_for_job", {
    prompt_id: promptId,
  })) as { content?: McpContentPart[] };

  const parsed = parseJobStatusContent(result.content);
  if (parsed !== undefined) return parsed;

  throw new Error("No wait response returned — upstream returned an empty payload");
}

/**
 * Cancel a pending or running job. Returns the server's plain-text response
 * describing whether the job was cancelled, already finished, or could not be found.
 */
export async function cancelJob(
  promptId: string,
): Promise<{ prompt_id: string; result: string }> {
  const client = await getMcpClient();
  const result = (await client.callTool("cancel_job", {
    prompt_id: promptId,
  })) as { content?: McpContentPart[] };

  const text =
    result.content?.[result.content.length - 1]?.text ??
    "No cancel response returned";
  return { prompt_id: promptId, result: text };
}

function parseJobStatusContent(
  content: McpContentPart[] | undefined,
): JobStatus | undefined {
  const parsed = parseJsonFromContent(content);
  if (parsed !== undefined) return parsed as JobStatus;
  const raw = content?.[content.length - 1]?.text;
  if (raw) return { prompt_id: "", raw };
  return undefined;
}
