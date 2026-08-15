import { readFile } from "node:fs/promises";
import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent } from "../mcp/parse.js";

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

/**
 * List saved workflows stored in the workspace.
 */
export async function listWorkflows(): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("list_saved_workflows", {})) as {
    content?: { text?: string }[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    return { error: "No workflows returned", workflows: [] };
  }

  const workflows = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : [];
  return { count: workflows.length, workflows };
}
