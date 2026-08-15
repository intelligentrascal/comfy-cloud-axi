import { runAxiCli, AxiError } from "axi-sdk-js";
import { VERSION } from "./version.js";
import { getDashboard } from "./commands/dashboard.js";
import { getJobStatus, getBatchStatus } from "./commands/job.js";
import { submitWorkflow, getOutput } from "./commands/workflow.js";
import { uploadImage } from "./commands/upload.js";
import { getQueue } from "./commands/queue.js";
import { searchModels } from "./commands/models.js";
import { searchTemplates } from "./commands/templates.js";
import { generateImage } from "./commands/generate.js";
import { setupHooks } from "./commands/setup.js";

const DESCRIPTION =
  "Comfy Cloud CLI for agents — token-efficient TOON output for AI generation workflows, jobs, and models";

const TOP_HELP = `Comfy Cloud CLI for agents

Usage: comfy-cloud-axi <command> [args] [flags]

Commands:
  job         Check job status
  workflow    Submit workflows and get output
  upload      Upload an image
  queue       Show queue status
  models      Search models
  templates   Search templates
  generate    Generate via partner model
  setup       Install session hooks

Flags:
  --help      Show help for any command
  --version   Show version

Examples:
  comfy-cloud-axi job status <prompt_id>
  comfy-cloud-axi workflow submit workflow.json
  comfy-cloud-axi generate bfl/flux-pro-1.1-ultra "a cat astronaut" [--confirm]`;

const COMMAND_HELP: Record<string, string> = {
  job: `Check job status

Usage: comfy-cloud-axi job <subcommand> [args]

Subcommands:
  status <prompt_id>  Check status of a job by prompt ID
  batch <batch_id>    Check status of a batch by batch ID

Flags:
  --help  Show this help`,
  workflow: `Submit workflows and get output

Usage: comfy-cloud-axi workflow <subcommand> [args]

Subcommands:
  submit <file>       Submit a workflow JSON file
  output <prompt_id>  Get output for a completed prompt

Flags:
  --help  Show this help`,
  upload: `Upload an image

Usage: comfy-cloud-axi upload <file>

Flags:
  --help  Show this help`,
  queue: `Show queue status

Usage: comfy-cloud-axi queue

Flags:
  --help  Show this help`,
  models: `Search models

Usage: comfy-cloud-axi models <query>

Flags:
  --help  Show this help`,
  templates: `Search templates

Usage: comfy-cloud-axi templates <query>

Flags:
  --help  Show this help`,
  generate: `Generate via partner model

Usage: comfy-cloud-axi generate <model> "<prompt>" [--confirm]

Generates an image with a paid Comfy Cloud partner model (e.g. bfl/flux-pro-1.1-ultra).
Comfy Cloud spend-gates generation: without --confirm the tool reports the
spend request and does NOT generate. Pass --confirm only after the user has
explicitly agreed to spend credits.

Flags:
  --help  Show this help`,
  setup: `Install session hooks

Usage: comfy-cloud-axi setup hooks

Flags:
  --help  Show this help`,
};

export async function main(): Promise<void> {
  await runAxiCli({
    description: DESCRIPTION,
    topLevelHelp: TOP_HELP,
    version: VERSION,
    argv: process.argv.slice(2),
    home: async () => {
      const { queue, help } = await getDashboard();
      return {
        queue_running: queue.running,
        queue_pending: queue.pending,
        help,
      };
    },
    commands: {
      job: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.job;
        }
        const subcommand = args[0];
        if (subcommand === "status") {
          const promptId = args[1];
          if (!promptId) {
            throw new AxiError("prompt_id is required", "VALIDATION_ERROR", [
              "Run `comfy-cloud-axi job status <prompt_id>`",
            ]);
          }
          return await getJobStatus(promptId);
        }
        if (subcommand === "batch") {
          const batchId = args[1];
          if (!batchId) {
            throw new AxiError("batch_id is required", "VALIDATION_ERROR", [
              "Run `comfy-cloud-axi job batch <batch_id>`",
            ]);
          }
          return await getBatchStatus(batchId);
        }
        throw new AxiError(
          `unknown subcommand \`${subcommand}\``,
          "VALIDATION_ERROR",
          ["valid subcommands: status, batch"],
        );
      },
      workflow: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.workflow;
        }
        const subcommand = args[0];
        if (subcommand === "submit") {
          const filePath = args[1];
          if (!filePath) {
            throw new AxiError(
              "workflow file path is required",
              "VALIDATION_ERROR",
              ["Run `comfy-cloud-axi workflow submit <file>`"],
            );
          }
          return await submitWorkflow(filePath);
        }
        if (subcommand === "output") {
          const promptId = args[1];
          if (!promptId) {
            throw new AxiError("prompt_id is required", "VALIDATION_ERROR", [
              "Run `comfy-cloud-axi workflow output <prompt_id>`",
            ]);
          }
          return await getOutput(promptId);
        }
        throw new AxiError(
          `unknown subcommand \`${subcommand}\``,
          "VALIDATION_ERROR",
          ["valid subcommands: submit, output"],
        );
      },
      upload: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.upload;
        }
        const filePath = args[0];
        if (!filePath) {
          throw new AxiError("file path is required", "VALIDATION_ERROR", [
            "Run `comfy-cloud-axi upload <file>`",
          ]);
        }
        return await uploadImage(filePath);
      },
      queue: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.queue;
        }
        return await getQueue();
      },
      models: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.models;
        }
        const query = args.join(" ") || "";
        if (!query) {
          throw new AxiError("search query is required", "VALIDATION_ERROR", [
            "Run `comfy-cloud-axi models <query>`",
          ]);
        }
        return await searchModels(query);
      },
      templates: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.templates;
        }
        const query = args.join(" ") || "";
        if (!query) {
          throw new AxiError("search query is required", "VALIDATION_ERROR", [
            "Run `comfy-cloud-axi templates <query>`",
          ]);
        }
        return await searchTemplates(query);
      },
      generate: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.generate;
        }
        const confirm = args.includes("--confirm");
        const positionals = args.filter((a) => a !== "--confirm");
        const model = positionals[0];
        const prompt = positionals.slice(1).join(" ");
        if (!model || !prompt) {
          throw new AxiError("model and prompt are required", "VALIDATION_ERROR", [
            'Run `comfy-cloud-axi generate <model> "<prompt>" [--confirm]`',
          ]);
        }
        return await generateImage(model, prompt, undefined, confirm);
      },
      setup: async (args) => {
        if (args[0] === "--help") {
          return COMMAND_HELP.setup;
        }
        const subcommand = args[0];
        if (subcommand !== "hooks") {
          throw new AxiError(
            `unknown subcommand \`${subcommand}\``,
            "VALIDATION_ERROR",
            ["Run `comfy-cloud-axi setup hooks`"],
          );
        }
        const result = await setupHooks();
        return { setup: result };
      },
    },
  });
}
