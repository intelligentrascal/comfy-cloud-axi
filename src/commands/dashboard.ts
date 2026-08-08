import { getMcpClient } from "../mcp/client.js";

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

  let running = 0;
  let pending = 0;

  if (queueResult.content?.[0]?.text) {
    try {
      const data = JSON.parse(queueResult.content[0].text);
      running = data.queue_running?.length ?? 0;
      pending = data.queue_pending?.length ?? 0;
    } catch {
      // parse failure — leave counts at 0
    }
  }

  return {
    queue: { running, pending },
    help: [
      "Run `comfy-cloud-axi job status <prompt_id>` to check a job",
      "Run `comfy-cloud-axi workflow submit <file>` to run a workflow",
      "Run `comfy-cloud-axi models <query>` to find models",
    ],
  };
}
