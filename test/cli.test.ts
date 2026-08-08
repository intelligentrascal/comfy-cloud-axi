import { describe, it, expect, vi } from "vitest";

vi.mock("../src/mcp/client.js", () => ({
  getMcpClient: vi.fn().mockResolvedValue({
    callTool: vi.fn().mockImplementation(async (toolName: string) => {
      if (toolName === "get_queue") {
        return { content: [{ text: '{"queue_running":[],"queue_pending":[]}' }] };
      }
      if (toolName === "get_job_status") {
        return { content: [{ text: '{"prompt_id":"abc123","status":"completed","ready":true}' }] };
      }
      return { content: [{ text: "{}" }] };
    }),
    listTools: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  closeMcpClient: vi.fn().mockResolvedValue(undefined),
}));

describe("cli commands", () => {
  it("dashboard returns queue counts", async () => {
    const { getDashboard } = await import("../src/commands/dashboard.js");
    const result = await getDashboard();
    expect(result.queue.running).toBe(0);
    expect(result.queue.pending).toBe(0);
    expect(result.help.length).toBeGreaterThan(0);
  });

  it("job status parses response", async () => {
    const { getJobStatus } = await import("../src/commands/job.js");
    const result = await getJobStatus("abc123");
    expect(result.prompt_id).toBe("abc123");
    expect(result.status).toBe("completed");
    expect(result.ready).toBe(true);
  });
});
