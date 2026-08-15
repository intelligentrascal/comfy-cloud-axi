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

  return { error: "No job status returned", prompt_id: promptId };
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

  return { error: "No batch status returned" };
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

  const parsed = parseJobStatus(result.content);
  if (parsed !== undefined) return parsed;

  return { error: "No wait response returned", prompt_id: promptId };
}

function parseJobStatus(
  content: McpContentPart[] | undefined
): JobStatus | undefined {
  const parsed = parseJsonFromContent(content);
  if (parsed !== undefined) return parsed as JobStatus;
  const raw = content?.[content.length - 1]?.text;
  if (raw) return { prompt_id: "", raw };
  return undefined;
}
