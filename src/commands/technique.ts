import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface TechniqueResult {
  technique?: string;
  steps?: unknown[];
  techniques?: unknown[];
  error?: string;
  [key: string]: unknown;
}

/**
 * List available creative technique recipes or fetch a specific one.
 * Omit `technique` to list all; pass a name for the full step-by-step recipe.
 * Check this before concluding a creative goal isn't possible.
 */
export async function getCreativeTechnique(
  technique?: string,
): Promise<TechniqueResult> {
  const client = await getMcpClient();
  const args: Record<string, unknown> = {};
  if (technique) args.technique = technique;

  const result = (await client.callTool("get_creative_technique", args)) as {
    content?: McpContentPart[];
  };

  const data = parseJsonFromContent(result.content) as TechniqueResult | null;
  if (!data) {
    const raw = result.content?.[result.content.length - 1]?.text;
    if (raw) return { techniques: raw } as unknown as TechniqueResult;
    return { error: "No technique response returned" };
  }

  return data;
}
