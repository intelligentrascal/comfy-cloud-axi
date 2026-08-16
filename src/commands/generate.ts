import { getMcpClient } from "../mcp/client.js";

export interface GenerateResult {
	prompt_id?: string;
	status: string;
	[key: string]: unknown;
}

/**
 * Generate an image, video, audio, or other media via a paid Comfy Cloud
 * partner model.
 *
 * Comfy Cloud spend-gates `partner_generate`: the server first responds with a
 * confirmation prompt (not JSON). Pass `confirm: true` to actually spend
 * credits from the workspace. Without it, the response is returned verbatim so
 * the caller can surface the spend request instead of a cryptic parse error.
 */
export async function generateImage(
	model: string,
	prompt: string,
	aspectRatio?: string,
	confirm = false,
	type = "image",
): Promise<GenerateResult> {
	const client = await getMcpClient();
	const args: Record<string, unknown> = {
		type,
		model,
		prompt,
		client_os:
			process.platform === "win32"
				? "windows"
				: process.platform === "darwin"
					? "macos"
					: "linux",
	};
	if (aspectRatio) args.aspect_ratio = aspectRatio;
	if (confirm) args.confirm = true;

	const result = (await client.callTool("partner_generate", args)) as {
		content?: { text?: string }[];
	};

	const text = result.content?.[0]?.text;
	if (text) {
		try {
			return JSON.parse(text) as GenerateResult;
		} catch {
			// Not JSON. Spend-gated responses (and server-side errors) come back as
			// plain text - surface them as-is so the confirmation request or error
			// is visible instead of a generic parse failure.
			return {
				message: text,
				status: /^Submitted/i.test(text) ? "submitted" : "unconfirmed",
				confirm_required: /CONFIRMATION REQUIRED/i.test(text),
			};
		}
	}

	throw new Error("No generation response returned — upstream returned an empty payload");
}
