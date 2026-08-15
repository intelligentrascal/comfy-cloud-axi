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

/**
 * Run a workflow already saved in the workspace by filename or workflow_id.
 * Optionally override inputs: `{ nodeId: { inputName: value } }`.
 */
export async function runSavedWorkflow(
  filenameOrId: string,
  options?: {
    inputOverrides?: Record<string, Record<string, unknown>>;
    confirm?: boolean;
  },
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();

  // Detect UUID format → use workflow_id; otherwise → filename
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      filenameOrId,
    );
  const args: Record<string, unknown> = isUuid
    ? { workflow_id: filenameOrId }
    : { filename: filenameOrId };

  if (options?.inputOverrides) args.input_overrides = options.inputOverrides;
  if (options?.confirm) args.confirm = true;

  const result = (await client.callTool("run_saved_workflow", args)) as {
    content?: { text?: string }[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (data) return data;

  const text = result.content?.[0]?.text;
  if (text) {
    try { return JSON.parse(text); } catch { return { result: text }; }
  }

  return { error: "No run_saved_workflow response returned" };
}

/**
 * Make a completed job's output available as input for a new workflow.
 * Returns a filename usable in LoadImage nodes.
 */
export async function usePreviousOutput(
  promptId: string,
  outputIndex = 0,
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const result = (await client.callTool("use_previous_output", {
    prompt_id: promptId,
    output_index: outputIndex,
  })) as { content?: { text?: string }[] };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (data) return data;

  const text = result.content?.[result.content.length - 1]?.text;
  if (text) return { filename: text };

  return { error: "No use_previous_output response returned" };
}
