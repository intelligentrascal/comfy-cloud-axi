---
name: comfy-cloud-axi
description: "Comfy Cloud CLI for agents — generate images/videos via 20+ partner models, submit ComfyUI workflows, check job status, search models, and manage resources. TOON output for token efficiency."
---

# comfy-cloud-axi

Comfy Cloud CLI for agents — token-efficient TOON output for AI generation workflows, jobs, models, and templates.

## Requirements

Set `COMFY_CLOUD_API_KEY` in the environment. Get a key at https://platform.comfy.org/profile/api-keys.

## Commands

```bash
# Discover
npx -y comfy-cloud-axi catalog                              # list all partner models + credit costs
npx -y comfy-cloud-axi guide <model>                        # prompting tips for a model
npx -y comfy-cloud-axi estimate <model> "<prompt>"          # credit cost without generating

# Partner generation (paid — requires credits)
npx -y comfy-cloud-axi generate <model> "<prompt>"          # show spend request (no charge)
npx -y comfy-cloud-axi generate <model> "<prompt>" --confirm  # charge credits and generate
npx -y comfy-cloud-axi generate <model> "<prompt>" --aspect-ratio 16:9 --confirm

# Job tracking
npx -y comfy-cloud-axi job status <prompt_id>              # poll once
npx -y comfy-cloud-axi job wait <prompt_id>                # block until ready (preferred)
npx -y comfy-cloud-axi job batch <batch_id>                # batch status

# ComfyUI workflows
npx -y comfy-cloud-axi workflow list                        # list saved workflows
npx -y comfy-cloud-axi workflow submit <file>               # submit workflow JSON → prompt_id
npx -y comfy-cloud-axi workflow output <prompt_id>          # get output

# Batch workflows
npx -y comfy-cloud-axi batch submit <file>                  # submit batch JSON → batch_id
npx -y comfy-cloud-axi batch output <batch_id>              # get batch output

# Templates
npx -y comfy-cloud-axi templates <query>                    # search templates
npx -y comfy-cloud-axi templates run <template_id>          # run a template → prompt_id

# Resources
npx -y comfy-cloud-axi models <query>                       # search ComfyUI model library
npx -y comfy-cloud-axi upload <file>                        # upload an image
npx -y comfy-cloud-axi queue                                # queue status
npx -y comfy-cloud-axi                                      # dashboard
```

## Partner model IDs

Use `npx -y comfy-cloud-axi catalog` to get the authoritative list with current credit costs — the catalog changes as providers add and retire models.

Common providers you'll see in catalog output:

| Provider prefix | Examples |
|---|---|
| `bfl/` | Black Forest Labs (Flux) |
| `openai/` | OpenAI image models |
| `stability/` | Stability AI (SD3, Stable Image) |
| `ideogram/` | Ideogram |
| `recraft/` | Recraft |
| `luma/` | Luma AI (Photon) |
| `kling/` | Kling AI (video) |

Always pass the full `provider/model-id` string from catalog output to `generate` and `estimate`.

## Workflows

### Partner generation (quick path)

```
catalog              → find model ID and credit cost
guide <model>        → optional: get prompting tips
estimate <model> "…" → confirm credit cost to user
generate <model> "…" --confirm  → generate (prompt_id returned)
job wait <prompt_id> → block until ready
workflow output <prompt_id>  → retrieve result URLs
```

### ComfyUI workflow (full path)

```
workflow list        → find or confirm a saved workflow
workflow submit <f>  → submit → prompt_id
job wait <prompt_id> → block until ready
workflow output <prompt_id>  → retrieve result
```

### Template-based generation

```
templates <query>                → find template_id
guide <model>                    → optional prompting tips
templates run <template_id>      → submit → prompt_id
job wait <prompt_id>             → block until ready
workflow output <prompt_id>      → retrieve result
```

### Batch jobs

```
batch submit <file>  → submit batch JSON → batch_id
job batch <batch_id> → check status
batch output <batch_id>  → retrieve all outputs
```

## Spend-gate

`generate` is spend-gated. Without `--confirm`, the server returns a confirmation message showing the credit cost — **no credits are charged**. This is intentional:

1. Run `generate <model> "<prompt>"` first (no `--confirm`) to surface the confirmation text and cost to the user.
2. Get explicit user approval.
3. Re-run with `--confirm` to actually generate.

Alternatively, use `estimate <model> "<prompt>"` to get the credit cost without triggering the full confirmation flow.

## Notes

- All output is TOON-encoded for token efficiency.
- `job wait` is preferred over polling `job status` in a loop — the server handles the wait.
- `models <query>` searches the ComfyUI model library (checkpoints, LoRAs). For partner generation models, use `catalog`.
- `workflow output` and `batch output` return URLs or base64 data for the generated assets.
