import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent } from "../mcp/parse.js";

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
