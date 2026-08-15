/**
 * Tests against the actual MCP response shapes captured from cloud.comfy.org/mcp.
 *
 * Three bugs drive these tests:
 *  1. get_queue returns TWO content parts — a non-JSON preamble then `{"running":N,"pending":N}`.
 *     queue.ts and dashboard.ts only read content[0] (the preamble) and silently return 0s.
 *  2. search_models / search_templates wrap results in `{"data":[...]}` — the envelope key
 *     is "data", not "models"/"templates".  The commands miss it and leak the envelope.
 *  3. QueueStatus carried queue_running/queue_pending (old shape); the live field names are
 *     running/pending.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMcpClient } from "../src/mcp/client.js";

vi.mock("../src/mcp/client.js", () => ({
  getMcpClient: vi.fn(),
  closeMcpClient: vi.fn().mockResolvedValue(undefined),
}));

/** Build a minimal mock MCP client whose callTool returns pre-canned responses. */
function mockClient(responses: Record<string, unknown>) {
  return {
    callTool: vi.fn().mockImplementation(async (toolName: string) => {
      if (toolName in responses) return responses[toolName];
      return { content: [{ text: "{}" }] };
    }),
    listTools: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.mocked(getMcpClient).mockReset();
});

// ---------------------------------------------------------------------------
// Shared parse utility
// ---------------------------------------------------------------------------

describe("parseJsonFromContent", () => {
  it("returns the first parseable JSON part, skipping a non-JSON preamble", async () => {
    const { parseJsonFromContent } = await import("../src/mcp/parse.js");
    const result = parseJsonFromContent([
      { text: "Account-wide queue counts are listed below:" },
      { text: '{"running":2,"pending":5}' },
    ]);
    expect(result).toEqual({ running: 2, pending: 5 });
  });

  it("returns undefined when no part contains valid JSON", async () => {
    const { parseJsonFromContent } = await import("../src/mcp/parse.js");
    expect(
      parseJsonFromContent([{ text: "just prose" }, { text: "still prose" }])
    ).toBeUndefined();
  });

  it("returns undefined for an empty or missing content array", async () => {
    const { parseJsonFromContent } = await import("../src/mcp/parse.js");
    expect(parseJsonFromContent([])).toBeUndefined();
    expect(parseJsonFromContent(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getQueue — two-part response
// ---------------------------------------------------------------------------

describe("getQueue", () => {
  it("extracts running/pending from the JSON part of a two-part get_queue response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_queue: {
          content: [
            { text: "Account-wide queue counts are listed below:" },
            { text: '{"running":3,"pending":7}' },
          ],
        },
      })
    );
    const { getQueue } = await import("../src/commands/queue.js");
    const result = await getQueue();
    expect(result.running).toBe(3);
    expect(result.pending).toBe(7);
  });

  it("returns zero counts when the queue is empty", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_queue: {
          content: [
            { text: "Account-wide queue counts are listed below:" },
            { text: '{"running":0,"pending":0}' },
          ],
        },
      })
    );
    const { getQueue } = await import("../src/commands/queue.js");
    const result = await getQueue();
    expect(result.running).toBe(0);
    expect(result.pending).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getDashboard — two-part response + running/pending field names
// ---------------------------------------------------------------------------

describe("getDashboard", () => {
  it("reports non-zero running and pending counts from the JSON part of a two-part response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_queue: {
          content: [
            { text: "Account-wide queue counts are listed below:" },
            { text: '{"running":1,"pending":4}' },
          ],
        },
      })
    );
    const { getDashboard } = await import("../src/commands/dashboard.js");
    const result = await getDashboard();
    expect(result.queue.running).toBe(1);
    expect(result.queue.pending).toBe(4);
  });

  it("still returns help hints alongside the counts", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_queue: {
          content: [
            { text: "Account-wide queue counts are listed below:" },
            { text: '{"running":0,"pending":0}' },
          ],
        },
      })
    );
    const { getDashboard } = await import("../src/commands/dashboard.js");
    const result = await getDashboard();
    expect(result.help.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// searchModels — {data:[...]} envelope
// ---------------------------------------------------------------------------

describe("searchModels", () => {
  it("extracts models from the data.data array when the response uses a {data:[...]} envelope", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        search_models: {
          content: [
            {
              text: JSON.stringify({
                data: [
                  { name: "flux-dev", type: "checkpoint" },
                  { name: "sdxl-base", type: "checkpoint" },
                ],
              }),
            },
          ],
        },
      })
    );
    const { searchModels } = await import("../src/commands/models.js");
    const result = await searchModels("flux");
    expect(result.count).toBe(2);
    expect(Array.isArray(result.models)).toBe(true);
    expect(result.models[0].name).toBe("flux-dev");
  });

  it("returns count 0 and an informational message when data.data is empty", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        search_models: {
          content: [{ text: JSON.stringify({ data: [] }) }],
        },
      })
    );
    const { searchModels } = await import("../src/commands/models.js");
    const result = await searchModels("xyzzy");
    expect(result.count).toBe(0);
    expect(result.message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// searchTemplates — {data:[...]} envelope
// ---------------------------------------------------------------------------

describe("searchTemplates", () => {
  it("extracts templates from the data.data array when the response uses a {data:[...]} envelope", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        search_templates: {
          content: [
            {
              text: JSON.stringify({
                data: [
                  { name: "portrait-gen", description: "Portrait generation" },
                ],
              }),
            },
          ],
        },
      })
    );
    const { searchTemplates } = await import("../src/commands/templates.js");
    const result = await searchTemplates("portrait");
    expect(result.count).toBe(1);
    expect(Array.isArray(result.templates)).toBe(true);
    expect(result.templates[0].name).toBe("portrait-gen");
  });

  it("returns count 0 and an informational message when data.data is empty", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        search_templates: {
          content: [{ text: JSON.stringify({ data: [] }) }],
        },
      })
    );
    const { searchTemplates } = await import("../src/commands/templates.js");
    const result = await searchTemplates("xyzzy");
    expect(result.count).toBe(0);
    expect(result.message).toBeTruthy();
  });
});
