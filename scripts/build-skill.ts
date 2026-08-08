/**
 * Generates skills/comfy-cloud-axi/SKILL.md from the CLI's own guidance.
 * Keeps the skill in sync with the CLI surface.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = join(__dirname, "..", "skills", "comfy-cloud-axi");
const skillPath = join(skillDir, "SKILL.md");

const content = `---
name: comfy-cloud-axi
description: "Comfy Cloud CLI for agents — use for generating images/videos, submitting workflows, checking job status, searching models, or managing Comfy Cloud resources. Wraps the Comfy Cloud MCP server with token-efficient TOON output."
---

# comfy-cloud-axi

Comfy Cloud CLI for agents — token-efficient TOON output for AI generation workflows, jobs, and models.

## Requirements

Set \`COMFY_CLOUD_API_KEY\` in the environment. Get your key at https://platform.comfy.org/profile/api-keys.

## Commands

\\\`\\\`\\\`bash
npx -y comfy-cloud-axi                              # dashboard — queue status
npx -y comfy-cloud-axi job status <prompt_id>        # check job status
npx -y comfy-cloud-axi workflow submit <file>        # submit workflow JSON
npx -y comfy-cloud-axi workflow output <prompt_id>   # get job output
npx -y comfy-cloud-axi upload <file>                 # upload an image
npx -y comfy-cloud-axi queue                         # show queue
npx -y comfy-cloud-axi models <query>                # search models
npx -y comfy-cloud-axi templates <query>             # search templates
npx -y comfy-cloud-axi generate <model> "<prompt>"   # generate via partner model
\\\`\\\`\\\`

## Workflow

1. Run \`npx -y comfy-cloud-axi\` for a dashboard showing queue status.
2. Submit workflows with \`workflow submit <file>\` — returns a \`prompt_id\`.
3. Poll status with \`job status <prompt_id>\` until \`ready: true\`.
4. Retrieve outputs with \`workflow output <prompt_id>\`.

## Notes

- All output is TOON-encoded for token efficiency.
- The \`generate\` command uses partner models (Flux, OpenAI, etc.) — requires credits.
- For multi-file batch jobs, use \`job batch <batch_id>\`.
`;

async function main() {
  await mkdir(skillDir, { recursive: true });
  await writeFile(skillPath, content.trim() + "\n", "utf-8");
  console.log(`Skill written to ${skillPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
