import { getMcpClient } from "../mcp/client.js";

export interface QueueStatus {
  queue_running: unknown[];
  queue_pending: unknown[];
  [key: string]: unknown;
}

export async function getQueue(): Promise<QueueStatus> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_queue", {})) as {
    content?: { text?: string }[];
  };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text) as QueueStatus;
    } catch {
      return { queue_running: [], queue_pending: [] };
    }
  }

  return { queue_running: [], queue_pending: [] };
}
