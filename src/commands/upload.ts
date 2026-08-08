import { readFile } from "node:fs/promises";
import { getMcpClient } from "../mcp/client.js";

export interface UploadResult {
  name: string;
  subfolder?: string;
  [key: string]: unknown;
}

export async function uploadImage(filePath: string): Promise<UploadResult> {
  const client = await getMcpClient();
  const fileBuffer = await readFile(filePath);
  const base64Content = fileBuffer.toString("base64");

  const result = (await client.callTool("upload_file", {
    content: base64Content,
    filename: filePath.split(/[\\/]/).pop() ?? "file",
  })) as { content?: { text?: string }[] };

  if (result.content?.[0]?.text) {
    try {
      return JSON.parse(result.content[0].text) as UploadResult;
    } catch {
      return { name: result.content[0].text };
    }
  }

  throw new Error("No upload result returned");
}
