import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface PartnerModel {
  id: string;
  name?: string;
  provider?: string;
  type?: string;
  credits_per_generation?: number;
  [key: string]: unknown;
}

export interface CatalogResult {
  count?: number;
  models: PartnerModel[];
  error?: string;
  [key: string]: unknown;
}

/**
 * Fetch the full catalog of available Comfy Cloud partner models.
 * Use this before `generate` to discover model IDs and per-generation credit costs.
 */
export async function getCatalog(): Promise<CatalogResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_catalog_overview", {})) as {
    content?: McpContentPart[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    return { error: "No catalog response returned", models: [] };
  }

  const models = (
    Array.isArray(data.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : []
  ) as PartnerModel[];

  return { count: models.length, models };
}
