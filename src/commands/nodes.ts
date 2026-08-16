import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent, type McpContentPart } from "../mcp/parse.js";

export interface NodeInfo {
  class_type: string;
  display_name?: string;
  category?: string;
  description?: string;
  [key: string]: unknown;
}

export interface NodesResult {
  count?: number;
  nodes: NodeInfo[];
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Search available ComfyUI nodes by text query or category.
 * Use `api_nodes_only: true` to find only partner/API-backed nodes.
 */
export async function searchNodes(
  query: string,
  options?: { category?: string; apiOnly?: boolean; limit?: number },
): Promise<NodesResult> {
  const client = await getMcpClient();
  const args: Record<string, unknown> = { q: query };
  if (options?.category) args.category = options.category;
  if (options?.apiOnly) args.api_nodes_only = true;
  if (options?.limit) args.limit = options.limit;

  const result = (await client.callTool("search_nodes", args)) as {
    content?: McpContentPart[];
  };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    throw new Error("No nodes response returned — upstream returned an empty payload");
  }

  const nodes = (
    Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
  ) as NodeInfo[];
  return {
    count: nodes.length,
    nodes,
    message: nodes.length === 0 ? "No nodes found" : undefined,
  };
}
