import { runAxiCli, AxiError } from "axi-sdk-js";
import { VERSION } from "./version.js";
import { closeMcpClient } from "./mcp/client.js";
import { getDashboard } from "./commands/dashboard.js";
import { getJobStatus, getBatchStatus, waitForJob } from "./commands/job.js";
import { submitWorkflow, getOutput, listWorkflows } from "./commands/workflow.js";
import { uploadImage } from "./commands/upload.js";
import { getQueue } from "./commands/queue.js";
import { searchModels } from "./commands/models.js";
import { searchTemplates, runTemplate } from "./commands/templates.js";
import { generateImage } from "./commands/generate.js";
import { getCatalog } from "./commands/catalog.js";
import { estimateCredits } from "./commands/estimate.js";
import { getPromptingGuide } from "./commands/guide.js";
import { submitBatch, getBatchOutput } from "./commands/batch.js";
import { setupHooks } from "./commands/setup.js";

const DESCRIPTION =
	"Comfy Cloud CLI for agents — token-efficient TOON output for AI generation workflows, jobs, and models";

const TOP_HELP = `Comfy Cloud CLI for agents

Usage: comfy-cloud-axi <command> [args] [flags]

Commands:
  catalog     List all partner models with credit costs
  estimate    Estimate credits for a generation
  guide       Get prompting tips for a partner model
  job         Check job status or wait for completion
  workflow    Submit, list, and get output from workflows
  batch       Submit and retrieve batch jobs
  upload      Upload an image
  queue       Show queue status
  models      Search ComfyUI models
  templates   Search and run templates
  generate    Generate via partner model (requires credits)
  setup       Install session hooks

Flags:
  --help      Show help for any command
  --version   Show version

Examples:
  comfy-cloud-axi catalog
  comfy-cloud-axi estimate bfl/flux-pro-1.1-ultra "a cat astronaut"
  comfy-cloud-axi generate bfl/flux-pro-1.1-ultra "a cat astronaut" --confirm
  comfy-cloud-axi workflow submit workflow.json
  comfy-cloud-axi job wait <prompt_id>`;

const COMMAND_HELP: Record<string, string> = {
	catalog: `List all available Comfy Cloud partner models

Usage: comfy-cloud-axi catalog

Run this first to discover model IDs and per-generation credit costs before
calling \`generate\` or \`estimate\`.

Flags:
  --help  Show this help`,
	estimate: `Estimate credits for a generation

Usage: comfy-cloud-axi estimate <model> "<prompt>" [--aspect-ratio <ratio>]

Shows the credit cost for a generation WITHOUT spending credits. Run before
\`generate --confirm\` so you can surface the cost and get user approval.

Flags:
  --aspect-ratio <ratio>  Aspect ratio (e.g. 16:9, 1:1)
  --help                  Show this help`,
	guide: `Get prompting tips for a partner model

Usage: comfy-cloud-axi guide <model>

Returns model-specific advice for writing effective prompts.

Flags:
  --help  Show this help`,
	job: `Check job status or wait for completion

Usage: comfy-cloud-axi job <subcommand> [args]

Subcommands:
  status <prompt_id>  Check status of a job by prompt ID
  batch <batch_id>    Check status of a batch by batch ID
  wait <prompt_id>    Block until the job is ready (preferred over polling)

Flags:
  --help  Show this help`,
	workflow: `Submit, list, and get output from workflows

Usage: comfy-cloud-axi workflow <subcommand> [args]

Subcommands:
  submit <file>       Submit a workflow JSON file — returns a prompt_id
  list                List saved workflows in this workspace
  output <prompt_id>  Get output for a completed prompt

Flags:
  --help  Show this help`,
	batch: `Submit and retrieve batch jobs

Usage: comfy-cloud-axi batch <subcommand> [args]

Subcommands:
  submit <file>       Submit a batch JSON file — returns a batch_id
  output <batch_id>   Get output for a completed batch

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
	models: `Search ComfyUI models

Usage: comfy-cloud-axi models <query>

Searches the ComfyUI model library (checkpoints, LoRAs, etc.). To find
partner generation models, use \`catalog\` instead.

Flags:
  --help  Show this help`,
	templates: `Search and run templates

Usage: comfy-cloud-axi templates <subcommand|query>

Subcommands:
  run <template_id>  Run a template by ID — returns a prompt_id

Or pass a search query directly:
  comfy-cloud-axi templates portrait

Flags:
  --help  Show this help`,
	generate: `Generate via partner model (requires credits)

Usage: comfy-cloud-axi generate <model> "<prompt>" [--confirm] [--aspect-ratio <ratio>]

Generates an image with a paid Comfy Cloud partner model.
Comfy Cloud spend-gates generation: without --confirm the server returns a
confirmation request showing the credit cost — it does NOT generate. Pass
--confirm only after the user has explicitly agreed to spend credits.

Flow:
  1. Run \`catalog\` to discover model IDs and per-generation costs
  2. Run \`estimate <model> "<prompt>"\` to confirm the credit cost
  3. Run \`generate <model> "<prompt>" --confirm\` to generate

Flags:
  --confirm                Authorise the credit spend and run the generation
  --aspect-ratio <ratio>   Aspect ratio (e.g. 16:9, 1:1, 9:16)
  --help                   Show this help`,
	setup: `Install session hooks

Usage: comfy-cloud-axi setup hooks

Flags:
  --help  Show this help`,
};

export async function main(): Promise<void> {
	try {
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
			catalog: async (args) => {
				if (args[0] === "--help") {
					return COMMAND_HELP.catalog;
				}
				return await getCatalog();
			},
			estimate: async (args) => {
				if (args[0] === "--help") {
					return COMMAND_HELP.estimate;
				}
				const aspectRatioIdx = args.indexOf("--aspect-ratio");
				const aspectRatio =
					aspectRatioIdx !== -1 ? args[aspectRatioIdx + 1] : undefined;
				const positionals = args.filter(
					(a, i) =>
						a !== "--aspect-ratio" &&
						(aspectRatioIdx === -1 || i !== aspectRatioIdx + 1),
				);
				const model = positionals[0];
				const prompt = positionals.slice(1).join(" ");
				if (!model || !prompt) {
					throw new AxiError(
						"model and prompt are required",
						"VALIDATION_ERROR",
						['Run `comfy-cloud-axi estimate <model> "<prompt>"`'],
					);
				}
				return await estimateCredits(model, prompt, aspectRatio);
			},
			guide: async (args) => {
				if (args[0] === "--help") {
					return COMMAND_HELP.guide;
				}
				const model = args[0];
				if (!model) {
					throw new AxiError("model is required", "VALIDATION_ERROR", [
						"Run `comfy-cloud-axi guide <model>`",
					]);
				}
				return await getPromptingGuide(model);
			},
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
				if (subcommand === "wait") {
					const promptId = args[1];
					if (!promptId) {
						throw new AxiError("prompt_id is required", "VALIDATION_ERROR", [
							"Run `comfy-cloud-axi job wait <prompt_id>`",
						]);
					}
					return await waitForJob(promptId);
				}
				throw new AxiError(
					`unknown subcommand \`${subcommand}\``,
					"VALIDATION_ERROR",
					["valid subcommands: status, batch, wait"],
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
				if (subcommand === "list") {
					return await listWorkflows();
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
					["valid subcommands: submit, list, output"],
				);
			},
			batch: async (args) => {
				if (args[0] === "--help") {
					return COMMAND_HELP.batch;
				}
				const subcommand = args[0];
				if (subcommand === "submit") {
					const filePath = args[1];
					if (!filePath) {
						throw new AxiError(
							"batch file path is required",
							"VALIDATION_ERROR",
							["Run `comfy-cloud-axi batch submit <file>`"],
						);
					}
					return await submitBatch(filePath);
				}
				if (subcommand === "output") {
					const batchId = args[1];
					if (!batchId) {
						throw new AxiError("batch_id is required", "VALIDATION_ERROR", [
							"Run `comfy-cloud-axi batch output <batch_id>`",
						]);
					}
					return await getBatchOutput(batchId);
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
				if (args[0] === "run") {
					const templateId = args[1];
					if (!templateId) {
						throw new AxiError(
							"template_id is required",
							"VALIDATION_ERROR",
							["Run `comfy-cloud-axi templates run <template_id>`"],
						);
					}
					return await runTemplate(templateId);
				}
				const query = args.join(" ") || "";
				if (!query) {
					throw new AxiError("search query is required", "VALIDATION_ERROR", [
						"Run `comfy-cloud-axi templates <query>` or `templates run <id>`",
					]);
				}
				return await searchTemplates(query);
			},
			generate: async (args) => {
				if (args[0] === "--help") {
					return COMMAND_HELP.generate;
				}
				const confirm = args.includes("--confirm");
				const aspectRatioIdx = args.indexOf("--aspect-ratio");
				const aspectRatio =
					aspectRatioIdx !== -1 ? args[aspectRatioIdx + 1] : undefined;
				const positionals = args.filter(
					(a, i) =>
						a !== "--confirm" &&
						a !== "--aspect-ratio" &&
						(aspectRatioIdx === -1 || i !== aspectRatioIdx + 1),
				);
				const model = positionals[0];
				const prompt = positionals.slice(1).join(" ");
				if (!model || !prompt) {
					throw new AxiError(
						"model and prompt are required",
						"VALIDATION_ERROR",
						['Run `comfy-cloud-axi generate <model> "<prompt>" [--confirm]`'],
					);
				}
				return await generateImage(model, prompt, aspectRatio, confirm);
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
	} finally {
		await closeMcpClient();
	}
}
