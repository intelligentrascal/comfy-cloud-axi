import { readFile } from "node:fs/promises";
import { getMcpClient } from "../mcp/client.js";

export interface WorkflowSubmission {
  prompt_id: string;
  [key: string]: unknown;
}

export async function submitWorkflow(
  filePath: string
): Promise<WorkflowSubmission> {
  const client = await getMcpClient();
  const raw = await readFile(filePath, "utf-8");
  const workflow = JSON.parse(raw);

  const result = (await client.callTool("submit_workflow", {
    workflow,
  })) as { content?: { text?: string }[] };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text) as WorkflowSubmission;
    } catch {
      return { prompt_id: result.content[0].text };
    }
  }

  throw new Error("No prompt_id returned from workflow submission");
}

export async function getOutput(
  promptId: string,
  outputIndex: number = 0
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_output", {
    prompt_id: promptId,
    output_index: outputIndex,
  })) as { content?: { text?: string }[] };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return { output: result.content[0].text };
    }
  }

  return { error: "No output returned" };
}
