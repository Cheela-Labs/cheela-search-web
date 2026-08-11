import type { SearchEvent } from "./types";

/**
 * Reads the SSE stream from `/api/search`.
 *
 * `fetch` and a manual frame parser rather than `EventSource`, for two
 * reasons that both bite in practice: EventSource reconnects automatically
 * when the server closes the stream, so a completed search silently restarts
 * itself forever; and it cannot be aborted mid-flight, which is exactly what a
 * follow-up query typed over a running one needs to do.
 */
export async function streamSearch(
	query: string,
	onEvent: (event: SearchEvent) => void,
	signal: AbortSignal,
): Promise<void> {
	const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
		signal,
		headers: { accept: "text/event-stream" },
	});

	if (!response.ok || !response.body) {
		throw new Error(`Search failed with ${response.status}`);
	}

	const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
	// Frames arrive split across chunks at arbitrary boundaries, so completed
	// frames are drained from a buffer rather than parsed per chunk.
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += value;

			let boundary = buffer.indexOf("\n\n");
			while (boundary !== -1) {
				const raw = buffer.slice(0, boundary);
				buffer = buffer.slice(boundary + 2);
				boundary = buffer.indexOf("\n\n");

				const payload = raw
					.split("\n")
					.filter((line) => line.startsWith("data:"))
					.map((line) => line.slice(5).trim())
					.join("\n");

				if (!payload) continue;
				try {
					onEvent(JSON.parse(payload) as SearchEvent);
				} catch {
					// A malformed frame is one lost update, not a failed search.
				}
			}
		}
	} finally {
		reader.cancel().catch(() => {});
	}
}
