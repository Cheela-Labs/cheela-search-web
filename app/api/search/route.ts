import { runPipeline } from "@/lib/search/pipeline";
import type { SearchEvent } from "@/lib/search/types";

/**
 * The query endpoint, as server-sent events.
 *
 * This is the seam. Today it runs `lib/search/pipeline.ts` against a fixture
 * corpus; when `apps/search-api` exists it proxies that instead, and nothing in
 * `components/` changes, because the surface only ever knew about the event
 * stream.
 *
 * SSE rather than a JSON response because the ordering is the product: sources
 * and capability chips are useful the moment they exist, roughly two seconds
 * before the composed answer is. Buffering the whole run into one response
 * would throw that away and make the surface feel slower than the pipeline is.
 */

export const dynamic = "force-dynamic";

/** Longer than the composed answer takes, short enough to bound a stuck run. */
export const maxDuration = 60;

const MAX_QUERY_LENGTH = 400;

function frame(event: SearchEvent): string {
	return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: Request) {
	const query = (new URL(request.url).searchParams.get("q") ?? "").slice(
		0,
		MAX_QUERY_LENGTH,
	);

	if (!query.trim()) {
		return new Response(JSON.stringify({ error: "Missing query" }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			// A disconnected client is the normal way this endpoint ends, not an
			// exceptional one: every follow-up query aborts the search running
			// before it. Once the stream is cancelled, `enqueue` and `close` both
			// throw `Invalid state`, and letting that escape turns routine user
			// behaviour into an unhandled rejection in the server log.
			const send = (event: SearchEvent) => {
				if (request.signal.aborted) return false;
				try {
					controller.enqueue(encoder.encode(frame(event)));
					return true;
				} catch {
					return false;
				}
			};

			try {
				for await (const event of runPipeline(query, request.signal)) {
					if (!send(event)) break;
				}
			} catch (error) {
				send({
					type: "error",
					message: error instanceof Error ? error.message : "Search failed",
				});
			} finally {
				try {
					controller.close();
				} catch {
					// Already cancelled by the disconnect.
				}
			}
		},
	});

	return new Response(stream, {
		headers: {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache, no-transform",
			connection: "keep-alive",
			// Proxies that buffer defeat the entire point of streaming this.
			"x-accel-buffering": "no",
		},
	});
}
