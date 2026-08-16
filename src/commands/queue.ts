import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent } from "../mcp/parse.js";

export interface QueueStatus {
  running: number;
  pending: number;
  [key: string]: unknown;
}

const EMPTY: QueueStatus = { running: 0, pending: 0 };

export async function getQueue(): Promise<QueueStatus> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_queue", {})) as {
    content?: { text?: string }[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data || typeof data !== "object") {
    throw new Error(
      "Queue response could not be decoded — the upstream server returned an unrecognisable payload"
    );
  }
  return {
    running: (data.running as number) ?? 0,
    pending: (data.pending as number) ?? 0,
  };
}
