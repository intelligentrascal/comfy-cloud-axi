# comfy-cloud-axi

[![npm](https://img.shields.io/npm/v/comfy-cloud-axi?style=flat-square)](https://www.npmjs.com/package/comfy-cloud-axi)
[![CI](https://img.shields.io/github/actions/workflow/status/intelligentrascal/comfy-cloud-axi/ci.yml?style=flat-square&label=ci)](https://github.com/intelligentrascal/comfy-cloud-axi/actions/workflows/ci.yml)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)

Comfy Cloud CLI for agents — designed with [AXI](https://github.com/kunchenguid/axi). Generate images, video, and audio via 22 partner models. Submit ComfyUI workflows and templates. Track jobs, estimate credits, search models and nodes, and report usage — all through a shell CLI with token-efficient TOON output.

## Setup

```bash
export COMFY_CLOUD_API_KEY="your-api-key"
```

Get your API key at [platform.comfy.org/profile/api-keys](https://platform.comfy.org/profile/api-keys).

## Quick Start

### Install the skill (recommended)

```bash
npx skills add intelligentrascal/comfy-cloud-axi --skill comfy-cloud-axi -g
```

### Zero setup

```bash
npx -y comfy-cloud-axi
```

### Session hook

```bash
npm install -g comfy-cloud-axi
comfy-cloud-axi setup hooks
```

## Commands

### Discovery

| Command | Description |
|---|---|
| `comfy-cloud-axi catalog` | Model type / template tag / node category taxonomy |
| `comfy-cloud-axi guide <model-or-topic>` | Prompting guide for a model family |
| `comfy-cloud-axi guide partner` | Full playbook: all 22 partner model slugs + routing |
| `comfy-cloud-axi technique` | List creative technique recipes |
| `comfy-cloud-axi technique <name>` | Fetch a step-by-step recipe |
| `comfy-cloud-axi estimate template <name>` | Estimate credits for a template (read-only) |
| `comfy-cloud-axi estimate workflow <file>` | Estimate credits for a workflow JSON file (read-only) |

### Partner Generation

| Command | Description |
|---|---|
| `comfy-cloud-axi generate <model> "<prompt>"` | Show spend request — no credits charged |
| `comfy-cloud-axi generate <model> "<prompt>" --confirm` | Generate and spend credits |
| `comfy-cloud-axi generate <model> "<prompt>" --type video --confirm` | Video generation |
| `comfy-cloud-axi generate <model> "<prompt>" --aspect-ratio 16:9 --confirm` | With aspect ratio |

### Job Tracking

| Command | Description |
|---|---|
| `comfy-cloud-axi job status <prompt_id>` | Point-in-time status snapshot |
| `comfy-cloud-axi job wait <prompt_id>` | Block until ready (preferred over polling) |
| `comfy-cloud-axi job cancel <prompt_id>` | Cancel a pending or running job |
| `comfy-cloud-axi job chain <prompt_id>` | Make output available as input for the next workflow |
| `comfy-cloud-axi job batch <batch_id>` | Check status of all jobs in a batch |

### Workflows

| Command | Description |
|---|---|
| `comfy-cloud-axi workflow list` | List saved workflows in the workspace |
| `comfy-cloud-axi workflow submit <file>` | Submit a workflow JSON → returns `prompt_id` |
| `comfy-cloud-axi workflow run <filename-or-uuid>` | Run a saved workflow |
| `comfy-cloud-axi workflow run <filename> --confirm` | Run with credit spend approved |
| `comfy-cloud-axi workflow output <prompt_id>` | Retrieve output URLs |

### Batch Jobs

| Command | Description |
|---|---|
| `comfy-cloud-axi batch submit <file>` | Submit a batch JSON → returns `batch_id` |
| `comfy-cloud-axi batch wait <batch_id>` | Block until all jobs terminal |
| `comfy-cloud-axi batch output <batch_id>` | Retrieve all ready outputs |

### Templates

| Command | Description |
|---|---|
| `comfy-cloud-axi templates <query>` | Search templates |
| `comfy-cloud-axi templates run <name>` | Run template → returns `prompt_id` |
| `comfy-cloud-axi templates run <name> --confirm` | Run with credit spend approved |

### Resources

| Command | Description |
|---|---|
| `comfy-cloud-axi nodes <query>` | Search ComfyUI nodes |
| `comfy-cloud-axi nodes <query> --api-only` | Partner / API-backed nodes only |
| `comfy-cloud-axi models <query>` | Search ComfyUI model library (checkpoints, LoRAs, etc.) |
| `comfy-cloud-axi upload <file>` | Upload an image |
| `comfy-cloud-axi queue` | Show account-wide queue status |
| `comfy-cloud-axi usage` | Workspace spend report |
| `comfy-cloud-axi usage --group-by product --months 3` | Spend grouped by product, last 3 months |

## Partner Models

22 partner models are reachable via `generate`. Run `comfy-cloud-axi guide partner` for the authoritative live list with per-provider routing notes.

**Image**

| Slug | Description |
|---|---|
| `bfl/flux-2-pro` | Text-to-image, up to 9 reference images |
| `bfl/flux-pro-1.1-ultra` | Text-to-image, aspect ratios 1:4 to 4:1 |
| `bfl/flux-kontext-pro` | Image editing from a prompt |
| `openai/images-generations` | OpenAI gen/edit — variant via `params.model` |
| `vertexai/nano-banana-2` | Google Gemini 3.1 Flash Image |
| `vertexai/nano-banana-pro` | Google Gemini 3 Pro Image |
| `xai/grok-image-generate` | xAI Grok Imagine |
| `ideogram/generate` | Ideogram text-to-image or edit |
| `byteplus/images-generations` | ByteDance Seedream — variant via `params.model` |

**Video**

| Slug | Description |
|---|---|
| `bfl/flux-3-video` | BFL FLUX 3 Video + audio |
| `byteplus/seedance-2.0-t2v` | ByteDance Seedance — tier via `params.model` |
| `kling/kling-v3-t2v` | Kling V3 |
| `minimax/hailuo-03-t2v` | MiniMax Hailuo 03 (H3) |
| `veo/veo-3-t2v` | Google Veo 3 — tier via `params.model` |

**Audio**

| Slug | Description |
|---|---|
| `elevenlabs/sound-generation` | ElevenLabs sound effect from text |

> SVG, 3D, and music use `templates run` instead (e.g. `api_recraft_v4_text_to_vector`, `api_hunyuan3d_text_to_model`).

## Workflows

**Quick generation (partner model)**
```
guide partner → pick slug
estimate template <name> → confirm cost (optional)
generate <slug> "<prompt>" → spend request (no charge)
generate <slug> "<prompt>" --confirm → prompt_id
job wait <prompt_id> → workflow output <prompt_id>
```

**ComfyUI workflow**
```
workflow list → workflow run <name> [--confirm]
job wait <prompt_id> → workflow output <prompt_id>
```

**Template**
```
templates <query> → templates run <name> [--confirm]
job wait <prompt_id> → workflow output <prompt_id>
```

**Batch**
```
batch submit <file> → batch_id
batch wait <batch_id> (repeat if timed_out: true)
batch output <batch_id>
```

**Chain workflows**
```
workflow run first.json → job wait → job chain <prompt_id>
workflow submit next.json → job wait → workflow output
```

> All commands that spend credits are spend-gated: run without `--confirm` first to see the cost, then re-run with `--confirm` after the user agrees.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run dev
```

## License

MIT
