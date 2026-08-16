import { readFile } from "node:fs/promises";
import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface EstimateResult {
  credits?: number;
  cost_usd?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Estimate the credit cost of a workflow or template BEFORE running it.
 * Read-only — nothing is submitted or spent.
 *
 * Pass either:
 *   - templateName: a template `name` from search_templates
 *   - workflowFile: path to a workflow JSON file (API or save format)
 */
export async function estimateTemplate(
  templateName: string,
): Promise<EstimateResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("estimate_credits", {
    template_name: templateName,
  })) as { content?: McpContentPart[] };

  return parseEstimateResult(result.content);
}

export async function estimateWorkflow(
  workflowFile: string,
): Promise<EstimateResult> {
  const client = await getMcpClient();
  const raw = await readFile(workflowFile, "utf-8");
  const workflow = JSON.parse(raw);

  const result = (await client.callTool("estimate_credits", {
    workflow,
  })) as { content?: McpContentPart[] };

  return parseEstimateResult(result.content);
}

function parseEstimateResult(
  content: McpContentPart[] | undefined,
): EstimateResult {
  const data = parseJsonFromContent(content) as EstimateResult | null;
  if (data) return data;
  const raw = content?.[content.length - 1]?.text;
  if (raw) return { raw } as EstimateResult;
  throw new Error("No estimate response returned — upstream returned an empty payload");
}
