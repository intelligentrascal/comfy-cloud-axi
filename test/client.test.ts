import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    callTool: vi.fn().mockResolvedValue({
      content: [{ text: '{"status": "completed", "ready": true}' }],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("mcp client", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.COMFY_CLOUD_API_KEY = "test-key";
  });

  it("throws when COMFY_CLOUD_API_KEY is missing", async () => {
    delete process.env.COMFY_CLOUD_API_KEY;
    const { getMcpClient } = await import("../src/mcp/client.js");
    await expect(getMcpClient()).rejects.toThrow("COMFY_CLOUD_API_KEY");
  });
});
