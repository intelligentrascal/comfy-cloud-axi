import { runAxiCli, AxiError } from "axi-sdk-js";
import { VERSION } from "./version.js";
import { closeMcpClient } from "./mcp/client.js";
import { getDashboard } from "./commands/dashboard.js";
import { getJobStatus, getBatchStatus, waitForJob, cancelJob } from "./commands/job.js";
import {
  submitWorkflow,
  getOutput,
  listWorkflows,
  runSavedWorkflow,
  usePreviousOutput,
} from "./commands/workflow.js";
import { uploadImage } from "./commands/upload.js";
import { getQueue } from "./commands/queue.js";
import { searchModels } from "./commands/models.js";
import { searchTemplates, runTemplate } from "./commands/templates.js";
import { generateImage } from "./commands/generate.js";
import { getCatalog } from "./commands/catalog.js";
import { estimateTemplate, estimateWorkflow } from "./commands/estimate.js";
import { getPromptingGuide } from "./commands/guide.js";
import { submitBatch, getBatchOutput, waitForBatch } from "./commands/batch.js";
import { searchNodes } from "./commands/nodes.js";
import { getUsageReport } from "./commands/usage.js";
import { getCreativeTechnique } from "./commands/technique.js";
import { setupHooks } from "./commands/setup.js";

const DESCRIPTION =
	"Comfy Cloud CLI for agents — token-efficient TOON output for AI generation workflows, jobs, models, and templates";

const TOP_HELP = `Comfy Cloud CLI for agents

Usage: comfy-cloud-axi <command> [args] [flags]

Commands:
  catalog     Show search taxonomy (model types, template tags, node categories)
  guide       Prompting guide for a model family or partner model playbook
  estimate    Estimate credit cost for a template or workflow
  technique   Creative technique recipes (list or fetch by name)

  generate    Generate via partner model (image/video/audio — requires credits)
  job         Check, wait, cancel, or chain jobs
  workflow    Submit, list, run, and get output from workflows
  batch       Submit, wait, and retrieve batch jobs
  templates   Search and run workflow templates
  nodes       Search available ComfyUI nodes
  models      Search ComfyUI model library

  upload      Upload an image
  queue       Show queue status
  usage       Workspace spend report
  setup       Install session hooks

Flags:
  --help      Show help for any command
  --version   Show version

Examples:
  comfy-cloud-axi guide partner              # list all 22 partner model slugs
  comfy-cloud-axi estimate template flux-turbo-t2i
  comfy-cloud-axi generate bfl/flux-2-pro "a cat astronaut" --confirm
  comfy-cloud-axi workflow run my-workflow.json
  comfy-cloud-axi job wait <prompt_id>`;

const COMMAND_HELP: Record<string, string> = {
	catalog: `Show search taxonomy (model types, template tags, node categories)

Usage: comfy-cloud-axi catalog

Returns the valid filter values for search_models (type), search_templates (tag),
and search_nodes (category) with result counts.

To list all 22 partner model slugs: comfy-cloud-axi guide partner

Flags:
  --help  Show this help`,
	guide: `Get a prompting guide for a model family or the full partner model playbook

Usage: comfy-cloud-axi guide <model-or-topic>

Pass a model family name (e.g. "flux dev", "sdxl", "wan") for workflow settings.
Pass "partner" for the complete partner_generate playbook: all 22 registered
partner model slugs, per-provider params, and edit routing.

Topics: seedance-video, openai-images, templates, saved-workflows, output-downloads

Flags:
  --help  Show this help`,
	estimate: `Estimate credit cost for a template or workflow (read-only — nothing is run)

Usage:
  comfy-cloud-axi estimate template <template-name>   # estimate a template by name
  comfy-cloud-axi estimate workflow <file.json>        # estimate a workflow JSON file

Flags:
  --help  Show this help`,
	technique: `List or fetch creative technique recipes

Usage:
  comfy-cloud-axi technique           # list all available techniques
  comfy-cloud-axi technique <name>    # get the full step-by-step recipe

Flags:
  --help  Show this help`,
	generate: `Generate via partner model (image/video/audio — requires credits)

Usage: comfy-cloud-axi generate <model> "<prompt>" [--type <type>] [--confirm]

Generates via a paid Comfy Cloud partner model. Spend-gated: without --confirm
the server returns a confirmation with the credit cost — no credits charged.
Pass --confirm only after the user has agreed to spend credits.

Flow:
  1. guide partner            # see all 22 model slugs + pricing notes
  2. generate <model> "<p>"   # shows spend request (no charge)
  3. generate <model> "<p>" --confirm  # generates, returns prompt_id
  4. job wait <prompt_id>     # block until ready
  5. workflow output <prompt_id>  # retrieve URLs

Common slugs (use "guide partner" for the full live list):
  Image:  bfl/flux-2-pro, bfl/flux-pro-1.1-ultra, bfl/flux-kontext-pro,
          openai/images-generations, ideogram/generate,
          vertexai/nano-banana-2, vertexai/nano-banana-pro,
          xai/grok-image-generate, byteplus/images-generations
  Video:  bfl/flux-3-video, byteplus/seedance-2.0-t2v, kling/kling-v3-t2v,
          kling/kling-3.0-turbo-t2v, minimax/hailuo-03-t2v, veo/veo-3-t2v
  Audio:  elevenlabs/sound-generation

Flags:
  --type <type>            image (default), video, audio, 3d, svg, music
  --aspect-ratio <ratio>   e.g. 16:9, 1:1, 9:16
  --confirm                Authorise credit spend and generate
  --help                   Show this help`,
	job: `Check, wait, cancel, or chain jobs

Usage: comfy-cloud-axi job <subcommand> [args]

Subcommands:
  status <prompt_id>    Point-in-time status check
  wait <prompt_id>      Block until ready (preferred over polling)
  cancel <prompt_id>    Cancel a pending or running job
  chain <prompt_id>     Make this job's output available as input for next workflow
  batch <batch_id>      Check status of all jobs in a batch

Flags:
  --help  Show this help`,
	workflow: `Submit, list, run, and get output from workflows

Usage: comfy-cloud-axi workflow <subcommand> [args]

Subcommands:
  submit <file>               Submit a workflow JSON → prompt_id
  list                        List saved workflows in this workspace
  run <filename-or-uuid>      Run a saved workflow by filename or UUID
  output <prompt_id>          Get output for a completed job

Flags:
  --confirm  (run) Authorise credit spend if the workflow uses paid API nodes
  --help     Show this help`,
	batch: `Submit, wait, and retrieve batch jobs

Usage: comfy-cloud-axi batch <subcommand> [args]

Subcommands:
  submit <file>       Submit a batch JSON → batch_id
  wait <batch_id>     Block until all jobs terminal (~25s per call; repeat if timed_out)
  output <batch_id>   Get output for all ready jobs in the batch

Flags:
  --help  Show this help`,
	templates: `Search and run workflow templates

Usage:
  comfy-cloud-axi templates <query>          # search templates
  comfy-cloud-axi templates run <name>       # run a template → prompt_id

The template name for "run" must match exactly (from search results).
Templates with paid API nodes are spend-gated: run without --confirm first,
then re-run with --confirm after user approves the credit spend.

Flags:
  --confirm  Authorise credit spend for this template run
  --help     Show this help`,
	nodes: `Search available ComfyUI nodes

Usage: comfy-cloud-axi nodes <query> [--api-only] [--category <cat>]

Flags:
  --api-only         Only return partner/API-backed nodes
  --category <cat>   Filter by category prefix (e.g. "image", "sampling")
  --help             Show this help`,
	models: `Search the ComfyUI model library (checkpoints, LoRAs, VAEs, etc.)

Usage: comfy-cloud-axi models <query>

For partner generation models (Flux, OpenAI, etc.) use: guide partner

Flags:
  --help  Show this help`,
	upload: `Upload an image file

Usage: comfy-cloud-axi upload <file>

Flags:
  --help  Show this help`,
	queue: `Show account-wide queue status

Usage: comfy-cloud-axi queue

Flags:
  --help  Show this help`,
	usage: `Show workspace spend report

Usage: comfy-cloud-axi usage [--group-by model|endpoint|product] [--months N]

Flags:
  --group-by <field>  Group breakdown by model (default), endpoint, or product
  --months <N>        Months of history, 1–24 (default 1)
  --help              Show this help`,
	setup: `Install session hooks

Usage: comfy-cloud-axi setup hooks

Flags:
  --help  Show this help`,
};

/** Throw VALIDATION_ERROR if any arg starts with '--' (unknown flags leaked into positional list). */
function rejectUnknownFlagInPositionals(positionals: string[], usage: string): void {
	const flag = positionals.find((a) => a.startsWith("--"));
	if (flag)
		throw new AxiError(
			`unknown flag: ${flag}`,
			"VALIDATION_ERROR",
			[`Run \`comfy-cloud-axi ${usage} --help\` to see available flags`],
		);
}

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
				if (args[0] === "--help") return COMMAND_HELP.catalog;
				const unexpected = args.filter((a) => a !== "--help");
				if (unexpected.length > 0)
					throw new AxiError(
						`unexpected argument: ${unexpected[0]}`,
						"VALIDATION_ERROR",
						["Usage: comfy-cloud-axi catalog"],
					);
				return await getCatalog();
			},
			guide: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.guide;
				const modelOrTopic = args.join(" ") || "";
				if (!modelOrTopic) {
					throw new AxiError(
						"model or topic is required",
						"VALIDATION_ERROR",
						[
							'Pass a model family (e.g. "flux dev") or "partner" for all partner model slugs',
							"Or pass a topic: seedance-video, openai-images, templates, saved-workflows, output-downloads",
						],
					);
				}
				return await getPromptingGuide(modelOrTopic);
			},
			estimate: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.estimate;
				const subcommand = args[0];
				const target = args[1];
				if (subcommand === "template") {
					if (!target) {
						throw new AxiError("template name is required", "VALIDATION_ERROR", [
							"Run `comfy-cloud-axi estimate template <template-name>`",
						]);
					}
					return await estimateTemplate(target);
				}
				if (subcommand === "workflow") {
					if (!target) {
						throw new AxiError("workflow file path is required", "VALIDATION_ERROR", [
							"Run `comfy-cloud-axi estimate workflow <file.json>`",
						]);
					}
					return await estimateWorkflow(target);
				}
				throw new AxiError(
					`unknown subcommand \`${subcommand}\``,
					"VALIDATION_ERROR",
					["valid subcommands: template, workflow"],
				);
			},
			technique: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.technique;
				const name = args[0];
				return await getCreativeTechnique(name);
			},
			generate: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.generate;
				const confirm = args.includes("--confirm");
				const typeIdx = args.indexOf("--type");
				const genType = typeIdx !== -1 ? args[typeIdx + 1] : "image";
				const aspectRatioIdx = args.indexOf("--aspect-ratio");
				const aspectRatio =
					aspectRatioIdx !== -1 ? args[aspectRatioIdx + 1] : undefined;
				if (aspectRatioIdx !== -1 && (!aspectRatio || aspectRatio.startsWith("--"))) {
					throw new AxiError(
						"--aspect-ratio requires a value (e.g. 16:9, 1:1, 9:16)",
						"VALIDATION_ERROR",
						['Usage: comfy-cloud-axi generate <model> "<prompt>" --aspect-ratio 16:9'],
					);
				}
				const positionals = args.filter(
					(a, i) =>
						a !== "--confirm" &&
						a !== "--type" &&
						a !== "--aspect-ratio" &&
						(typeIdx === -1 || i !== typeIdx + 1) &&
						(aspectRatioIdx === -1 || i !== aspectRatioIdx + 1),
				);
				rejectUnknownFlagInPositionals(positionals, "generate");
				const model = positionals[0];
				const prompt = positionals.slice(1).join(" ");
				if (!model || !prompt) {
					throw new AxiError(
						"model and prompt are required",
						"VALIDATION_ERROR",
						['Run `comfy-cloud-axi generate <model> "<prompt>" [--confirm]`'],
					);
				}
				return await generateImage(model, prompt, aspectRatio, confirm, genType);
			},
			job: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.job;
				const subcommand = args[0];
				if (subcommand === "status") {
					const promptId = args[1];
					if (!promptId) throw new AxiError("prompt_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi job status <prompt_id>`"]);
					rejectUnknownFlagInPositionals(args.slice(2), "job status");
					const extraStatus = args.slice(2).filter((a) => !a.startsWith("--"));
					if (extraStatus.length > 0) throw new AxiError(`unexpected argument: ${extraStatus[0]}`, "VALIDATION_ERROR", ["Run `comfy-cloud-axi job status --help`"]);
					return await getJobStatus(promptId);
				}
				if (subcommand === "wait") {
					const promptId = args[1];
					if (!promptId) throw new AxiError("prompt_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi job wait <prompt_id>`"]);
					rejectUnknownFlagInPositionals(args.slice(2), "job wait");
					const extraWait = args.slice(2).filter((a) => !a.startsWith("--"));
					if (extraWait.length > 0) throw new AxiError(`unexpected argument: ${extraWait[0]}`, "VALIDATION_ERROR", ["Run `comfy-cloud-axi job wait --help`"]);
					return await waitForJob(promptId);
				}
				if (subcommand === "cancel") {
					const promptId = args[1];
					if (!promptId) throw new AxiError("prompt_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi job cancel <prompt_id>`"]);
					rejectUnknownFlagInPositionals(args.slice(2), "job cancel");
					const extraCancel = args.slice(2).filter((a) => !a.startsWith("--"));
					if (extraCancel.length > 0) throw new AxiError(`unexpected argument: ${extraCancel[0]}`, "VALIDATION_ERROR", ["Run `comfy-cloud-axi job cancel --help`"]);
					return await cancelJob(promptId);
				}
				if (subcommand === "chain") {
					const promptId = args[1];
					if (!promptId) throw new AxiError("prompt_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi job chain <prompt_id>`"]);
					const outputIndex = args[2] ? parseInt(args[2], 10) : 0;
					rejectUnknownFlagInPositionals(args.slice(3), "job chain");
					const extraChain = args.slice(3).filter((a) => !a.startsWith("--"));
					if (extraChain.length > 0) throw new AxiError(`unexpected argument: ${extraChain[0]}`, "VALIDATION_ERROR", ["Run `comfy-cloud-axi job chain --help`"]);
					return await usePreviousOutput(promptId, outputIndex);
				}
				if (subcommand === "batch") {
					const batchId = args[1];
					if (!batchId) throw new AxiError("batch_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi job batch <batch_id>`"]);
					rejectUnknownFlagInPositionals(args.slice(2), "job batch");
					const extraBatch = args.slice(2).filter((a) => !a.startsWith("--"));
					if (extraBatch.length > 0) throw new AxiError(`unexpected argument: ${extraBatch[0]}`, "VALIDATION_ERROR", ["Run `comfy-cloud-axi job batch --help`"]);
					return await getBatchStatus(batchId);
				}
				throw new AxiError(
					`unknown subcommand \`${subcommand}\``,
					"VALIDATION_ERROR",
					["valid subcommands: status, wait, cancel, chain, batch"],
				);
			},
			workflow: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.workflow;
				const confirm = args.includes("--confirm");
				const positionals = args.filter((a) => a !== "--confirm");
				const subcommand = positionals[0];
				if (subcommand === "submit") {
					const filePath = positionals[1];
					if (!filePath) throw new AxiError("workflow file path is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi workflow submit <file>`"]);
					return await submitWorkflow(filePath);
				}
				if (subcommand === "list") {
					return await listWorkflows();
				}
				if (subcommand === "run") {
					const filenameOrId = positionals[1];
					if (!filenameOrId) throw new AxiError("filename or UUID is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi workflow run <filename-or-uuid>`"]);
					return await runSavedWorkflow(filenameOrId, { confirm });
				}
				if (subcommand === "output") {
					const promptId = positionals[1];
					if (!promptId) throw new AxiError("prompt_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi workflow output <prompt_id>`"]);
					return await getOutput(promptId);
				}
				throw new AxiError(
					`unknown subcommand \`${subcommand}\``,
					"VALIDATION_ERROR",
					["valid subcommands: submit, list, run, output"],
				);
			},
			batch: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.batch;
				const subcommand = args[0];
				if (subcommand === "submit") {
					const filePath = args[1];
					if (!filePath) throw new AxiError("batch file path is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi batch submit <file>`"]);
					return await submitBatch(filePath);
				}
				if (subcommand === "wait") {
					const batchId = args[1];
					if (!batchId) throw new AxiError("batch_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi batch wait <batch_id>`"]);
					return await waitForBatch(batchId);
				}
				if (subcommand === "output") {
					const batchId = args[1];
					if (!batchId) throw new AxiError("batch_id is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi batch output <batch_id>`"]);
					return await getBatchOutput(batchId);
				}
				throw new AxiError(
					`unknown subcommand \`${subcommand}\``,
					"VALIDATION_ERROR",
					["valid subcommands: submit, wait, output"],
				);
			},
			templates: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.templates;
				const confirm = args.includes("--confirm");
				const positionals = args.filter((a) => a !== "--confirm");
				if (positionals[0] === "run") {
					const templateName = positionals[1];
					if (!templateName) throw new AxiError("template name is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi templates run <name>`"]);
					return await runTemplate(templateName, { confirm });
				}
				const query = positionals.join(" ") || "";
				if (!query) throw new AxiError("search query is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi templates <query>` or `templates run <name>`"]);
				return await searchTemplates(query);
			},
			nodes: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.nodes;
				const apiOnly = args.includes("--api-only");
				const categoryIdx = args.indexOf("--category");
				const category =
					categoryIdx !== -1 ? args[categoryIdx + 1] : undefined;
				const positionals = args.filter(
					(a, i) =>
						a !== "--api-only" &&
						a !== "--category" &&
						(categoryIdx === -1 || i !== categoryIdx + 1),
				);
				const query = positionals.join(" ") || "";
				return await searchNodes(query, { category, apiOnly });
			},
			models: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.models;
				const unknownFlag = args.find((a) => a.startsWith("--"));
				if (unknownFlag)
					throw new AxiError(
						`unknown flag: ${unknownFlag}`,
						"VALIDATION_ERROR",
						["Usage: comfy-cloud-axi models <query>", "No flags are supported for this command — pass your query as plain text"],
					);
				const query = args.join(" ") || "";
				if (!query) throw new AxiError("search query is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi models <query>`"]);
				return await searchModels(query);
			},
			upload: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.upload;
				const filePath = args[0];
				if (!filePath) throw new AxiError("file path is required", "VALIDATION_ERROR", ["Run `comfy-cloud-axi upload <file>`"]);
				return await uploadImage(filePath);
			},
			queue: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.queue;
				const unexpected = args.filter((a) => a !== "--help");
				if (unexpected.length > 0)
					throw new AxiError(
						`unexpected argument: ${unexpected[0]}`,
						"VALIDATION_ERROR",
						["Usage: comfy-cloud-axi queue"],
					);
				return await getQueue();
			},
			usage: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.usage;
				const groupByIdx = args.indexOf("--group-by");
				const groupBy = groupByIdx !== -1
					? (args[groupByIdx + 1] as "model" | "endpoint" | "product")
					: "model";
				const monthsIdx = args.indexOf("--months");
				const months = monthsIdx !== -1 ? parseInt(args[monthsIdx + 1], 10) : 1;
				return await getUsageReport(groupBy, months);
			},
			setup: async (args) => {
				if (args[0] === "--help") return COMMAND_HELP.setup;
				if (args[0] !== "hooks") throw new AxiError(`unknown subcommand \`${args[0]}\``, "VALIDATION_ERROR", ["Run `comfy-cloud-axi setup hooks`"]);
				return { setup: await setupHooks() };
			},
		},
		});
	} finally {
		await closeMcpClient();
	}
}
