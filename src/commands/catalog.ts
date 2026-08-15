import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface CatalogResult {
  model_types?: Array<{ type: string; count: number }>;
  template_tags?: Array<{ tag: string; count: number }>;
  node_categories?: Array<{ category: string; count: number }>;
  error?: string;
  [key: string]: unknown;
}

/**
 * Fetch the filter taxonomy for search_models, search_templates, and search_nodes.
 * Returns valid `type` values for search_models, `tag` values for search_templates,
 * and `category` values for search_nodes — each with result counts.
 *
 * For the list of partner model slugs, use: guide partner
 */
export async function getCatalog(): Promise<CatalogResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("get_catalog_overview", {})) as {
    content?: McpContentPart[];
  };

  const data = parseJsonFromContent(result.content) as CatalogResult | null;
  if (!data) {
    return { error: "No catalog response returned" };
  }

  return data;
}
