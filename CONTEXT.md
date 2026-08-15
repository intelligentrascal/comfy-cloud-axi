# comfy-cloud-axi — Context

A token-efficient CLI for AI agents to interact with [Comfy Cloud](https://cloud.comfy.org).
It speaks MCP to `https://cloud.comfy.org/mcp` and formats responses with TOON so they
fit inside an agent's context window.

## Glossary

| Term | Meaning |
|------|---------|
| **prompt_id** | UUID Comfy Cloud assigns to a single generation job |
| **batch_id** | UUID for a group of jobs submitted together |
| **workflow** | A ComfyUI node graph serialised as JSON |
| **queue** | The account-wide set of running and pending jobs |
| **generation** | A paid image-synthesis call via a partner model (e.g. `bfl/flux-pro-1.1-ultra`) |
| **spend-gate** | The confirmation step Comfy Cloud requires before charging credits |
| **MCP content part** | One element of the `content[]` array in an MCP tool response |
| **JSON part** | The MCP content part whose `.text` field parses as valid JSON (not always `content[0]`) |
| **data envelope** | The `{"data":[...]}` wrapper the live API puts around list results |

## MCP response conventions (cloud.comfy.org/mcp)

**Multi-part responses.** Several tools return two content parts:

```
content[0]  — human-readable preamble   (NOT valid JSON)
content[1]  — the JSON payload
```

Always use `parseJsonFromContent(content)` from `src/mcp/parse.ts` to extract the JSON.
Never read `content[0].text` directly.

**List endpoints** (`search_models`, `search_templates`) wrap their arrays in a `{"data":[...]}` envelope:

```json
{ "data": [ { "name": "flux-dev", "type": "checkpoint" }, ... ] }
```

Read `data.data`, not `data.models` or `data.templates`.

**Queue endpoint** (`get_queue`) returns flat numeric fields:

```json
{ "running": 0, "pending": 0 }
```

`QueueStatus` uses `running`/`pending` — not `queue_running`/`queue_pending`.

## Key source locations

| Path | Responsibility |
|------|----------------|
| `src/mcp/client.ts` | MCP singleton, `getMcpClient()`, `closeMcpClient()` |
| `src/mcp/parse.ts` | Shared `parseJsonFromContent()` utility |
| `src/commands/` | One file per CLI command |
| `src/cli.ts` | Command routing via `axi-sdk-js` |
| `bin/comfy-cloud-axi.ts` | Entry point; calls `main()` |
| `test/live-shapes.test.ts` | Regression tests for the live MCP response shapes above |
