import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface UsageResult {
  group_by?: string;
  summary?: { spend_micros: number };
  breakdown?: unknown[];
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Get a spend/usage report for the workspace.
 * Groups by model, endpoint, or product.
 */
export async function getUsageReport(
  groupBy: "model" | "endpoint" | "product" = "model",
  months: number = 1,
): Promise<UsageResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_usage_report", {
    group_by: groupBy,
    months,
  })) as { content?: McpContentPart[] };

  const data = parseJsonFromContent(result.content) as UsageResult | null;
  if (!data) {
    const raw = result.content?.[result.content.length - 1]?.text;
    if (raw) return { raw } as UsageResult;
    return { error: "No usage report returned" };
  }

  return data;
}
