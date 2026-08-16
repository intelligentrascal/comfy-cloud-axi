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
  if (typeof data.running !== "number" || typeof data.pending !== "number") {
    throw new Error(
      "Queue response is missing required fields — expected {running: number, pending: number} from upstream server"
    );
  }
  return {
    running: data.running,
    pending: data.pending,
  };
}
