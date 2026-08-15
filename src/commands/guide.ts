import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface GuideResult {
  model?: string;
  guide?: string;
  tips?: string[];
  error?: string;
  [key: string]: unknown;
}

/**
 * Fetch the Comfy Cloud prompting guide for a partner model.
 * Returns model-specific tips for writing effective prompts.
 */
export async function getPromptingGuide(model: string): Promise<GuideResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_prompting_guide", {
    model,
  })) as { content?: McpContentPart[] };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    // Guide may come back as plain text prose rather than JSON
    const raw = result.content?.[result.content.length - 1]?.text;
    if (raw) return { model, guide: raw };
    return { error: "No guide returned", model };
  }

  return { model, ...data } as GuideResult;
}
