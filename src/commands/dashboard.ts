import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent } from "../mcp/parse.js";

export interface DashboardResult {
  queue: {
    running: number;
    pending: number;
  };
  help: string[];
}

export async function getDashboard(): Promise<DashboardResult> {
  const client = await getMcpClient();

  const queueResult = (await client.callTool("get_queue", {})) as {
    content?: { text?: string }[];
  };

  const data = parseJsonFromContent(queueResult.content) as Record<
    string,
    unknown
  > | null;
  if (!data || typeof data !== "object") {
    throw new Error(
      "Dashboard queue response could not be decoded — the upstream server returned an unrecognisable payload"
    );
  }
  const running = (data.running as number) ?? 0;
  const pending = (data.pending as number) ?? 0;

  return {
    queue: { running, pending },
    help: [
      "Run `comfy-cloud-axi job status <prompt_id>` to check a job",
      "Run `comfy-cloud-axi workflow submit <file>` to run a workflow",
      "Run `comfy-cloud-axi models <query>` to find models",
    ],
  };
}
