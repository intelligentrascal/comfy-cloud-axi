import { getMcpClient } from "../mcp/client.js";

export interface JobStatus {
  prompt_id: string;
  status?: string;
  ready?: boolean;
  error?: string;
  [key: string]: unknown;
}

interface McpContent {
  text?: string;
}

/**
 * Comfy Cloud MCP responses carry multiple content parts: a human-readable
 * message first, then a JSON payload (and structuredContent). Pick the first
 * text part that parses as JSON, falling back to the last part's raw text.
 */
function parseJsonFromContent(content: McpContent[] | undefined): unknown {
  if (!content?.length) return undefined;
  for (const part of content) {
    if (!part.text) continue;
    try {
      return JSON.parse(part.text);
    } catch {
      // not JSON - keep looking
    }
  }
  return undefined;
}

export async function getJobStatus(promptId: string): Promise<JobStatus> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_job_status", {
    prompt_id: promptId,
  })) as { content?: McpContent[] };

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
  })) as { content?: McpContent[] };

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
