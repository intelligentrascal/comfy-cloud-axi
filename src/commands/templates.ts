import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface TemplateInfo {
  name: string;
  description?: string;
  tag?: string;
}

export interface TemplatesResult {
  count?: number;
  templates: TemplateInfo[];
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export async function searchTemplates(
  query: string,
  limit: number = 8
): Promise<TemplatesResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("search_templates", {
    q: query,
    limit,
  })) as { content?: { text?: string }[] };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    return { error: "No templates response returned", templates: [] };
  }

  try {
    // Live API wraps results in a {data:[...]} envelope.
    const templates = (
      Array.isArray(data.data) ? data.data : data
    ) as TemplateInfo[];
    return {
      count: templates.length,
      templates,
      message: templates.length === 0 ? "No templates found" : undefined,
    };
  } catch {
    return { error: "Failed to parse templates response", templates: [] };
  }
}

/**
 * Run a saved template by its ID.
 * Returns a `prompt_id` to track with `job wait` / `job status`.
 */
export async function runTemplate(
  templateId: string,
  inputs?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const client = await getMcpClient();
  const args: Record<string, unknown> = { template_id: templateId };
  if (inputs) args.inputs = inputs;

  const result = (await client.callTool("run_template", args)) as {
    content?: McpContentPart[];
  };

  const parsed = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (parsed !== undefined) {
    return parsed as Record<string, unknown>;
  }

  const text = result.content?.[result.content.length - 1]?.text;
  if (text) return { output: text };

  return { error: "No run_template response returned" };
}
