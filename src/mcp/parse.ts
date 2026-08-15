export interface McpContentPart {
  text?: string;
}

/**
 * Comfy Cloud MCP responses often carry multiple content parts: a human-readable
 * preamble first, then a JSON payload.  Iterate over all parts and return the
 * first one that parses as valid JSON, skipping prose strings.  Returns
 * `undefined` when no part yields valid JSON.
 */
export function parseJsonFromContent(
  content: McpContentPart[] | undefined
): unknown {
  if (!content?.length) return undefined;
  for (const part of content) {
    if (!part.text) continue;
    try {
      return JSON.parse(part.text);
    } catch {
      // not JSON — keep looking
    }
  }
  return undefined;
}
