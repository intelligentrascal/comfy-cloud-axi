import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface EstimateResult {
  credits?: number;
  cost_usd?: number;
  model?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Estimate the credit cost for a generation before committing.
 * Run this before `generate --confirm` so the caller can surface the cost
 * and get user approval without touching the spend-gate.
 */
export async function estimateCredits(
  model: string,
  prompt: string,
  aspectRatio?: string,
): Promise<EstimateResult> {
  const client = await getMcpClient();
  const args: Record<string, unknown> = { model, prompt };
  if (aspectRatio) args.aspect_ratio = aspectRatio;

  const result = (await client.callTool("estimate_credits", args)) as {
    content?: McpContentPart[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    const raw = result.content?.[result.content.length - 1]?.text;
    if (raw) return { raw } as EstimateResult;
    return { error: "No estimate response returned" };
  }

  return data as EstimateResult;
}
