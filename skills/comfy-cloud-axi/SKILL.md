---
name: comfy-cloud-axi
description: "Comfy Cloud CLI for agents — generate images/video/audio via 22 partner models, run ComfyUI workflows and templates, check job status, search models and nodes, estimate credits, and report usage. TOON output for token efficiency."
---

# comfy-cloud-axi

Comfy Cloud CLI for agents — token-efficient TOON output for AI generation, workflows, jobs, models, and templates.

## Requirements

Set `COMFY_CLOUD_API_KEY` in the environment. Get a key at https://platform.comfy.org/profile/api-keys.

## Commands

```bash
# Discovery
npx -y comfy-cloud-axi catalog                             # model type/tag/category taxonomy
npx -y comfy-cloud-axi guide <model-or-topic>              # prompting guide or partner playbook
npx -y comfy-cloud-axi guide partner                       # ALL 22 partner model slugs + routing
npx -y comfy-cloud-axi technique                           # list creative technique recipes
npx -y comfy-cloud-axi technique <name>                    # get full recipe steps

# Credit estimation (read-only — nothing is run)
npx -y comfy-cloud-axi estimate template <name>            # estimate a template by name
npx -y comfy-cloud-axi estimate workflow <file.json>       # estimate a workflow JSON file

# Partner generation (requires credits)
npx -y comfy-cloud-axi generate <model> "<prompt>"         # show spend request (no charge)
npx -y comfy-cloud-axi generate <model> "<prompt>" --confirm  # generate
npx -y comfy-cloud-axi generate <model> "<prompt>" --type video --confirm
npx -y comfy-cloud-axi generate <model> "<prompt>" --aspect-ratio 16:9 --confirm

# Job tracking
npx -y comfy-cloud-axi job status <prompt_id>              # point-in-time snapshot
npx -y comfy-cloud-axi job wait <prompt_id>                # block until ready (preferred)
npx -y comfy-cloud-axi job cancel <prompt_id>              # cancel a pending or running job
npx -y comfy-cloud-axi job chain <prompt_id> [output_idx]  # make output available for next workflow
npx -y comfy-cloud-axi job batch <batch_id>                # check all jobs in a batch

# ComfyUI workflows
npx -y comfy-cloud-axi workflow list                       # list saved workflows
npx -y comfy-cloud-axi workflow submit <file>              # submit workflow JSON → prompt_id
npx -y comfy-cloud-axi workflow run <filename-or-uuid>     # run a saved workflow
npx -y comfy-cloud-axi workflow run <filename> --confirm   # run with credit spend approved
npx -y comfy-cloud-axi workflow output <prompt_id>         # retrieve output URLs

# Batch jobs
npx -y comfy-cloud-axi batch submit <file>                 # submit batch JSON → batch_id
npx -y comfy-cloud-axi batch wait <batch_id>               # block until all jobs terminal
npx -y comfy-cloud-axi batch output <batch_id>             # retrieve all ready outputs

# Templates
npx -y comfy-cloud-axi templates <query>                   # search templates
npx -y comfy-cloud-axi templates run <name>                # run template → prompt_id
npx -y comfy-cloud-axi templates run <name> --confirm      # run with credit spend approved

# Resources
npx -y comfy-cloud-axi nodes <query>                       # search ComfyUI nodes
npx -y comfy-cloud-axi nodes <query> --api-only            # partner/API nodes only
npx -y comfy-cloud-axi nodes <query> --category <cat>      # filter by category
npx -y comfy-cloud-axi models <query>                      # search ComfyUI model library
npx -y comfy-cloud-axi upload <file>                       # upload an image
npx -y comfy-cloud-axi queue                               # queue status

# Reporting
npx -y comfy-cloud-axi usage                               # spend report (last 30 days, by model)
npx -y comfy-cloud-axi usage --group-by product --months 3

# Dashboard
npx -y comfy-cloud-axi                                     # queue status + help
```

## Partner model slugs (22 models — authoritative list: `guide partner`)

### Image
| Slug | Description |
|---|---|
| `bfl/flux-2-pro` | Text-to-image, up to 9 reference images (persisted) |
| `bfl/flux-2-max` | Text-to-image, premium quality (persisted) |
| `bfl/flux-pro-1.1-ultra` | Text-to-image, aspect ratios 1:4 to 4:1 (persisted) |
| `bfl/flux-kontext-pro` | Image editing from prompt, aspect ratios 1:4 to 4:1 (persisted) |
| `bfl/flux-kontext-max` | Image editing, premium quality (persisted) |
| `bfl/flux-pro-expand` | Outpainting with per-side expansion (direct, instant URL) |
| `bfl/flux-pro-fill` | Inpainting using a mask region (direct, instant URL) |
| `openai/images-generations` | OpenAI image gen/edit; pass variant via `params.model` (gpt-image-2, etc.) (persisted) |
| `ideogram/generate` | Text-to-image or edit; wrap params under `params.image_request` (persisted) |
| `vertexai/nano-banana-2` | Google Gemini 3.1 Flash Image — gen or edit (persisted) |
| `vertexai/nano-banana-2-lite` | Google Gemini 3.1 Flash Lite — cheap drafts (persisted) |
| `vertexai/nano-banana-pro` | Google Gemini 3 Pro Image — premium quality (persisted) |
| `xai/grok-image-generate` | xAI Grok Imagine text-to-image (persisted) |
| `xai/grok-image-edit` | xAI Grok Imagine image editing (direct, instant URL) |
| `byteplus/images-generations` | ByteDance Seedream; pass variant via `params.model` (persisted) |

### Video
| Slug | Description |
|---|---|
| `bfl/flux-3-video` | BFL FLUX 3 Video — text to video + audio (persisted) |
| `byteplus/seedance-2.0-t2v` | ByteDance Seedance; tier via `params.model` (2.0/2.0 Fast/2.0 Mini/2.5) (persisted) |
| `kling/kling-v3-t2v` | Kling V3 text-to-video (persisted) |
| `kling/kling-3.0-turbo-t2v` | Kling 3.0 Turbo — faster, native audio (persisted) |
| `minimax/hailuo-03-t2v` | MiniMax Hailuo 03 (H3) text-to-video (persisted) |
| `veo/veo-3-t2v` | Google Veo 3; tier via `params.model` (veo-3.1-generate, etc.) (persisted) |

### Audio
| Slug | Description |
|---|---|
| `elevenlabs/sound-generation` | ElevenLabs sound effect from text (persisted) |

SVG, 3D, and music have no `partner_generate` path — use `templates run` with appropriate template names (`api_recraft_v4_text_to_vector`, `api_hunyuan3d_text_to_model`, etc.).

## Workflows

### Quick generation (partner model)

```
guide partner          → pick a slug and note any params.model quirks
estimate template …    → optional: confirm credit cost
generate <slug> "<p>"  → spend request (no charge)
generate <slug> "<p>" --confirm  → generates, returns prompt_id
job wait <prompt_id>   → block until ready
workflow output <id>   → retrieve URLs
```

### ComfyUI workflow

```
workflow list          → find saved workflow filename/UUID
estimate workflow <f>  → optional: confirm credit cost
workflow run <name>    → submit → prompt_id (add --confirm for paid nodes)
job wait <prompt_id>   → block until ready
workflow output <id>   → retrieve result
```

### Template-based

```
templates <query>              → find template name
estimate template <name>       → optional: confirm credit cost
templates run <name>           → submit → prompt_id (add --confirm for paid templates)
job wait <prompt_id>           → block until ready
workflow output <prompt_id>    → retrieve result
```

### Batch (multiple independent generations)

```
batch submit <file>    → submit → batch_id (do this instead of N separate generates)
batch wait <batch_id>  → block (call again if timed_out: true)
batch output <batch_id> → retrieve all ready outputs
```

### Chaining workflows

```
workflow run first.json → prompt_id_1
job wait <prompt_id_1>
job chain <prompt_id_1>  → filename usable in LoadImage for the next workflow
workflow submit next.json (with LoadImage pointing at that filename)
job wait <prompt_id_2>
workflow output <prompt_id_2>
```

## Spend-gate

`generate`, `templates run`, and `workflow run` are spend-gated when they use paid nodes.
Without `--confirm`, the server returns a confirmation message with the credit cost — **nothing is charged**.

1. Run without `--confirm` → surface the cost to the user.
2. Get explicit approval.
3. Re-run with `--confirm`.

Alternatively use `estimate` to check cost before reaching the confirmation step.

## Notes

- All output is TOON-encoded for token efficiency.
- `job wait` is preferred over polling `job status` — the server handles waiting.
- `batch wait` may time out after ~25 s; call it again until all jobs are terminal.
- `models <query>` searches the ComfyUI model library (checkpoints, LoRAs, etc.). For partner generation models, run `guide partner`.
- `nodes --api-only` lists the underlying API nodes for partner providers.
- A wrong partner model slug bounces back naming the closest real slugs — try your best guess first.
