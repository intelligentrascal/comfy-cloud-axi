import { getMcpClient } from "../mcp/client.js";

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

  if (result.content?.[0]?.text) {
    try {
      const data = JSON.parse(result.content[0].text);
      const models = (data.models ?? data ?? []) as ModelInfo[];
      return {
        count: models.length,
        models,
        message: models.length === 0 ? "No models found" : undefined,
      };
    } catch {
      return { error: "Failed to parse models response", models: [] };
    }
  }

  return { error: "No models response returned", models: [] };
}
