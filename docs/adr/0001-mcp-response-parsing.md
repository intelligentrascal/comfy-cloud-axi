# ADR-0001 — Shared MCP response parsing via `parseJsonFromContent`

**Date:** 2026-08-15  
**Status:** Accepted

## Context

The live Comfy Cloud MCP server at `https://cloud.comfy.org/mcp` sends multi-part
responses for several tools.  For example `get_queue` returns:

```
content[0].text = "Account-wide queue counts are listed below:"   ← plain prose, NOT JSON
content[1].text = '{"running":0,"pending":0}'                     ← the actual payload
```

The initial implementation read `content[0].text` directly and called `JSON.parse` on it.
This silently returned the error-fallback value (empty arrays / zero counts) for every live
call, because the preamble string is never valid JSON.

Additionally:

- `search_models` and `search_templates` wrap their arrays in a `{"data":[...]}` envelope,
  not `{"models":[...]}` / `{"templates":[...]}` as the code assumed.
- `QueueStatus` used `queue_running`/`queue_pending` (old assumed shape);
  the live fields are `running`/`pending`.

## Decision

1. **Single shared utility.** `src/mcp/parse.ts` exports `parseJsonFromContent(content)`.
   It iterates over all content parts, returns the first one whose `.text` parses as valid
   JSON, and returns `undefined` if none do.  All command files import from there — no
   private copies.

2. **Envelope key is `data`.** List results are extracted from `data.data`.  If `data.data`
   is not an array we fall back to treating the whole parsed object as the list.

3. **QueueStatus fields are `running` and `pending`** (numbers, not arrays).

4. **`closeMcpClient()` called on every exit.** `main()` in `cli.ts` wraps `runAxiCli()`
   in `try/finally` and calls `closeMcpClient()` so the HTTP connection is always torn down.

## Consequences

- Adding a new command that calls an MCP list tool: import `parseJsonFromContent` and read
  `data.data` for the array, not a tool-specific key.
- If Comfy Cloud changes the preamble text the tests remain green; they test the JSON part.
- The `QueueStatus` interface is a breaking change from the pre-ADR shape.  Any consumer
  that read `queue_running` / `queue_pending` must be updated.
