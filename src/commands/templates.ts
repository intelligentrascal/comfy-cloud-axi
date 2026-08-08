import { getMcpClient } from "../mcp/client.js";

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

  if (result.content?.[0]?.text) {
    try {
      const data = JSON.parse(result.content[0].text);
      const templates = (data.templates ?? data ?? []) as TemplateInfo[];
      return {
        count: templates.length,
        templates,
        message: templates.length === 0 ? "No templates found" : undefined,
      };
    } catch {
      return { error: "Failed to parse templates response", templates: [] };
    }
  }

  return { error: "No templates response returned", templates: [] };
}
