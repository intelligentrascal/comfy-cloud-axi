import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://cloud.comfy.org/mcp";

export interface McpClient {
  callTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): Promise<{ name: string; description?: string }[]>;
  close(): Promise<void>;
}

let client: McpClient | null = null;

function getApiKey(): string {
  const key = process.env.COMFY_CLOUD_API_KEY;
  if (!key) {
    throw new Error(
      "COMFY_CLOUD_API_KEY is not set. Get your key at https://platform.comfy.org/profile/api-keys"
    );
  }
  return key;
}

export async function getMcpClient(): Promise<McpClient> {
  if (client) return client;

  const apiKey = getApiKey();
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        "X-API-Key": apiKey,
      },
    },
  });

  const impl = new Client(
    { name: "comfy-cloud-axi", version: "0.1.0" },
    { capabilities: {} }
  );

  await impl.connect(transport);

  client = {
    callTool: async (toolName: string, args: Record<string, unknown>) => {
      const result = (await impl.callTool({ name: toolName, arguments: args })) as {
        isError?: boolean;
        content?: { text?: string }[];
      };
      if (result.isError) {
        const errText = result.content?.[0]?.text ?? `${toolName} returned an error`;
        throw new Error(errText);
      }
      return result;
    },
    listTools: async () => {
      const { tools } = await impl.listTools();
      return tools.map((t) => ({ name: t.name, description: t.description }));
    },
    close: () => impl.close(),
  };

  return client;
}

export async function closeMcpClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}
