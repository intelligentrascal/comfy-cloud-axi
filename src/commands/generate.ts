import { getMcpClient } from "../mcp/client.js";

export interface GenerateResult {
  prompt_id?: string;
  status: string;
  [key: string]: unknown;
}

export async function generateImage(
  model: string,
  prompt: string,
  aspectRatio?: string
): Promise<GenerateResult> {
  const client = await getMcpClient();
  const args: Record<string, unknown> = {
    type: "image",
    model,
    prompt,
    client_os:
      process.platform === "win32"
        ? "windows"
        : process.platform === "darwin"
          ? "macos"
          : "linux",
  };
  if (aspectRatio) args.aspect_ratio = aspectRatio;

  const result = (await client.callTool("partner_generate", args)) as {
    content?: { text?: string }[];
  };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text) as GenerateResult;
    } catch {
      return { error: "Failed to parse generation response", status: "unknown" };
    }
  }

  return { error: "No generation response returned", status: "unknown" };
}
