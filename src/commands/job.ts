import { getMcpClient } from "../mcp/client.js";

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
  })) as { content?: { text?: string }[] };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text) as JobStatus;
    } catch {
      return { error: "Failed to parse job status", prompt_id: promptId };
    }
  }

  return { error: "No job status returned", prompt_id: promptId };
}

export async function getBatchStatus(
  batchId: string
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_batch_status", {
    batch_id: batchId,
  })) as { content?: { text?: string }[] };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { error: "Failed to parse batch status" };
    }
  }

  return { error: "No batch status returned" };
}
