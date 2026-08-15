/**
 * Tests for the 8 new commands added in the wayfinder expansion:
 * catalog, estimate, guide, job wait, workflow list, batch, templates run.
 *
 * Uses the same mock pattern as live-shapes.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMcpClient } from "../src/mcp/client.js";

vi.mock("../src/mcp/client.js", () => ({
  getMcpClient: vi.fn(),
  closeMcpClient: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(JSON.stringify({ workflows: [] })),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

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
// getCatalog — get_catalog_overview
// ---------------------------------------------------------------------------

describe("getCatalog", () => {
  it("returns model_types, template_tags, and node_categories from the real catalog shape", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_catalog_overview: {
          content: [
            {
              text: JSON.stringify({
                model_types: [
                  { type: "checkpoint", count: 75 },
                  { type: "lora", count: 750 },
                ],
                template_tags: [{ tag: "Text to Image", count: 90 }],
                node_categories: [{ category: "Basic", count: 279 }],
              }),
            },
          ],
        },
      })
    );
    const { getCatalog } = await import("../src/commands/catalog.js");
    const result = await getCatalog();
    expect(Array.isArray(result.model_types)).toBe(true);
    expect((result.model_types as unknown[]).length).toBe(2);
    expect(Array.isArray(result.template_tags)).toBe(true);
    expect(Array.isArray(result.node_categories)).toBe(true);
  });

  it("returns an error when no response content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_catalog_overview: { content: [] },
      })
    );
    const { getCatalog } = await import("../src/commands/catalog.js");
    const result = await getCatalog();
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// estimateCredits — estimate_credits
// ---------------------------------------------------------------------------

describe("estimateTemplate / estimateWorkflow", () => {
  it("estimateTemplate returns credits and cost from a JSON response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        estimate_credits: {
          content: [
            {
              text: JSON.stringify({
                credits: 10,
                cost_usd: 0.05,
              }),
            },
          ],
        },
      })
    );
    const { estimateTemplate } = await import("../src/commands/estimate.js");
    const result = await estimateTemplate("flux-turbo-t2i");
    expect(result.credits).toBe(10);
    expect(result.cost_usd).toBe(0.05);
  });

  it("estimateWorkflow falls back to {raw} when the response is plain text", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        estimate_credits: {
          content: [{ text: "This workflow will cost 10 credits." }],
        },
      })
    );
    const { estimateWorkflow } = await import("../src/commands/estimate.js");
    const result = await estimateWorkflow("workflow.json");
    expect(result.raw).toBeTruthy();
    expect(typeof result.raw).toBe("string");
  });

  it("estimateTemplate returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        estimate_credits: { content: [] },
      })
    );
    const { estimateTemplate } = await import("../src/commands/estimate.js");
    const result = await estimateTemplate("flux-turbo-t2i");
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getPromptingGuide — get_prompting_guide
// ---------------------------------------------------------------------------

describe("getPromptingGuide", () => {
  it("returns structured JSON guide with tips", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_prompting_guide: {
          content: [
            {
              text: JSON.stringify({
                guide: "Use descriptive adjectives...",
                tips: ["tip 1", "tip 2"],
              }),
            },
          ],
        },
      })
    );
    const { getPromptingGuide } = await import("../src/commands/guide.js");
    const result = await getPromptingGuide("bfl/flux-pro-1.1-ultra");
    expect(result.model).toBe("bfl/flux-pro-1.1-ultra");
    expect(result.guide).toBe("Use descriptive adjectives...");
    expect(Array.isArray(result.tips)).toBe(true);
    expect(result.tips).toHaveLength(2);
  });

  it("returns plain-text guide as {model, guide} when response is not JSON", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_prompting_guide: {
          content: [
            {
              text: "Use detailed scene descriptions. Avoid abstract terms.",
            },
          ],
        },
      })
    );
    const { getPromptingGuide } = await import("../src/commands/guide.js");
    const result = await getPromptingGuide("bfl/flux-pro-1.1-ultra");
    expect(result.model).toBe("bfl/flux-pro-1.1-ultra");
    expect(result.guide).toContain("Use detailed");
  });

  it("returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_prompting_guide: { content: [] },
      })
    );
    const { getPromptingGuide } = await import("../src/commands/guide.js");
    const result = await getPromptingGuide("bfl/flux-pro-1.1-ultra");
    expect(result.error).toBeTruthy();
    expect(result.model).toBe("bfl/flux-pro-1.1-ultra");
  });
});

// ---------------------------------------------------------------------------
// waitForJob — wait_for_job
// ---------------------------------------------------------------------------

describe("waitForJob", () => {
  it("returns ready job status from a single-part JSON response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        wait_for_job: {
          content: [
            {
              text: JSON.stringify({
                prompt_id: "abc123",
                ready: true,
                status: "complete",
              }),
            },
          ],
        },
      })
    );
    const { waitForJob } = await import("../src/commands/job.js");
    const result = await waitForJob("abc123");
    expect(result.prompt_id).toBe("abc123");
    expect(result.ready).toBe(true);
    expect(result.status).toBe("complete");
  });

  it("extracts JSON from a two-part response with a prose preamble", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        wait_for_job: {
          content: [
            { text: "Job is now ready:" },
            {
              text: JSON.stringify({
                prompt_id: "abc123",
                ready: true,
                status: "complete",
              }),
            },
          ],
        },
      })
    );
    const { waitForJob } = await import("../src/commands/job.js");
    const result = await waitForJob("abc123");
    expect(result.ready).toBe(true);
    expect(result.prompt_id).toBe("abc123");
  });

  it("returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        wait_for_job: { content: [] },
      })
    );
    const { waitForJob } = await import("../src/commands/job.js");
    const result = await waitForJob("abc123");
    expect(result.error).toBeTruthy();
    expect(result.prompt_id).toBe("abc123");
  });
});

// ---------------------------------------------------------------------------
// listWorkflows — list_saved_workflows
// ---------------------------------------------------------------------------

describe("listWorkflows", () => {
  it("returns workflows from {data:[...]} envelope", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        list_saved_workflows: {
          content: [
            {
              text: JSON.stringify({
                data: [
                  { id: "wf1", name: "My Workflow" },
                  { id: "wf2", name: "Portrait Gen" },
                ],
              }),
            },
          ],
        },
      })
    );
    const { listWorkflows } = await import("../src/commands/workflow.js");
    const result = await listWorkflows();
    expect(result.count).toBe(2);
    expect(Array.isArray(result.workflows)).toBe(true);
  });

  it("returns count 0 for an empty workflow list", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        list_saved_workflows: {
          content: [{ text: JSON.stringify({ data: [] }) }],
        },
      })
    );
    const { listWorkflows } = await import("../src/commands/workflow.js");
    const result = await listWorkflows();
    expect(result.count).toBe(0);
  });

  it("returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        list_saved_workflows: { content: [] },
      })
    );
    const { listWorkflows } = await import("../src/commands/workflow.js");
    const result = await listWorkflows();
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// submitBatch — submit_batch
// ---------------------------------------------------------------------------

describe("submitBatch", () => {
  it("returns batch_id from a JSON response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        submit_batch: {
          content: [
            { text: JSON.stringify({ batch_id: "batch_abc", count: 3 }) },
          ],
        },
      })
    );
    const { submitBatch } = await import("../src/commands/batch.js");
    const result = await submitBatch("/fake/batch.json");
    expect(result.batch_id).toBe("batch_abc");
  });

  it("throws when no batch_id is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        submit_batch: { content: [] },
      })
    );
    const { submitBatch } = await import("../src/commands/batch.js");
    await expect(submitBatch("/fake/batch.json")).rejects.toThrow(
      "No batch_id returned"
    );
  });
});

// ---------------------------------------------------------------------------
// getBatchOutput — get_batch_output
// ---------------------------------------------------------------------------

describe("getBatchOutput", () => {
  it("returns parsed output from a JSON response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_batch_output: {
          content: [
            {
              text: JSON.stringify({
                outputs: [{ url: "https://cdn.comfy.org/out/1.png", index: 0 }],
              }),
            },
          ],
        },
      })
    );
    const { getBatchOutput } = await import("../src/commands/batch.js");
    const result = await getBatchOutput("batch_abc");
    expect(Array.isArray(result.outputs)).toBe(true);
  });

  it("returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        get_batch_output: { content: [] },
      })
    );
    const { getBatchOutput } = await import("../src/commands/batch.js");
    const result = await getBatchOutput("batch_abc");
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// runTemplate — run_template
// ---------------------------------------------------------------------------

describe("runTemplate", () => {
  it("returns prompt_id from a JSON response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        run_template: {
          content: [
            {
              text: JSON.stringify({
                prompt_id: "tmpl_abc",
                status: "submitted",
              }),
            },
          ],
        },
      })
    );
    const { runTemplate } = await import("../src/commands/templates.js");
    const result = await runTemplate("portrait-gen");
    expect(result.prompt_id).toBe("tmpl_abc");
    expect(result.status).toBe("submitted");
  });

  it("returns {output: text} for a plain-text response", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        run_template: {
          content: [{ text: "Template submitted successfully." }],
        },
      })
    );
    const { runTemplate } = await import("../src/commands/templates.js");
    const result = await runTemplate("portrait-gen");
    expect(result.output).toContain("Template submitted");
  });

  it("returns an error when no content is returned", async () => {
    vi.mocked(getMcpClient).mockResolvedValue(
      mockClient({
        run_template: { content: [] },
      })
    );
    const { runTemplate } = await import("../src/commands/templates.js");
    const result = await runTemplate("portrait-gen");
    expect(result.error).toBeTruthy();
  });
});
