# comfy-cloud-axi

[![npm](https://img.shields.io/npm/v/comfy-cloud-axi?style=flat-square)](https://www.npmjs.com/package/comfy-cloud-axi)
[![CI](https://img.shields.io/github/actions/workflow/status/intelligentrascal/comfy-cloud-axi/ci.yml?style=flat-square&label=ci)](https://github.com/intelligentrascal/comfy-cloud-axi/actions/workflows/ci.yml)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue?style=flat-square)

Comfy Cloud CLI for agents — designed with [AXI](https://github.com/kunchenguid/axi) (Agent eXperience Interface).

Wraps the Comfy Cloud MCP server with token-efficient TOON output, contextual next-step suggestions, and structured error handling. Built for autonomous agents that interact with Comfy Cloud via shell execution.

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

## Usage

```bash
comfy-cloud-axi                              # dashboard — queue status + next steps
comfy-cloud-axi job status <prompt_id>        # check job status
comfy-cloud-axi job batch <batch_id>          # check batch status
comfy-cloud-axi workflow submit <file>        # submit a workflow JSON file
comfy-cloud-axi workflow output <prompt_id>   # get output for a completed job
comfy-cloud-axi upload <file>                 # upload an image
comfy-cloud-axi queue                         # show queue status
comfy-cloud-axi models <query>                # search models
comfy-cloud-axi templates <query>             # search templates
comfy-cloud-axi generate <model> "<prompt>"   # generate via partner model
comfy-cloud-axi setup hooks                   # install agent session hooks
comfy-cloud-axi update --check                # check for updates
```

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run dev
```

## License

MIT
