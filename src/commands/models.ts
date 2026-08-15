import { getMcpClient } from "../mcp/client.js";
import { parseJsonFromContent } from "../mcp/parse.js";

export interface ModelInfo {
  name: string;
  type?: string;
  base_model?: string;
  source?: string;
}

export interface ModelsResult {
  count?: number;
  models: ModelInfo[];
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export async function searchModels(
  query: string,
  limit: number = 8
): Promise<ModelsResult> {
  const client = await getMcpClient();
  const result = (await client.callTool("search_models", {
    q: query,
    limit,
  })) as { content?: { text?: string }[] };

  const data = parseJsonFromContent(result.content) as Record<
    string,
    unknown
  > | null;
  if (!data) {
    return { error: "No models response returned", models: [] };
  }

  try {
    // Live API wraps results in a {data:[...]} envelope.
    const models = (
      Array.isArray(data.data) ? data.data : data
    ) as ModelInfo[];
    return {
      count: models.length,
      models,
      message: models.length === 0 ? "No models found" : undefined,
    };
  } catch {
    return { error: "Failed to parse models response", models: [] };
  }
}
