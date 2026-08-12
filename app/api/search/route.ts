import { runPipeline } from "@/lib/search/pipeline";
import type { SearchEvent } from "@/lib/search/types";

/**
 * The query endpoint, as server-sent events.
 *
 * This is the seam, and it is now both halves of it. With `SEARCH_API_URL` set
 * it proxies `apps/search-api`; without it, it runs `lib/search/pipeline.ts`
 * against the fixture corpus. Nothing in `components/` knows the difference,
 * because the surface only ever knew about the event stream — which is what
 * that seam was for.
 *
 * Proxied rather than called from the browser. The API's CORS allowlist would
 * permit a direct call, but going through here keeps the request same-origin,
 * keeps the API's URL server-side, and leaves one place to add caching or a
 * rate limit later. The cost is one hop, and the body is passed through
 * unbuffered so it costs no latency to first byte.
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

/**
 * Where the real query plane lives. Unset in a checkout with no backend, which
 * is why the fixture corpus is still here rather than deleted — a surface that
 * cannot run without a deployed API is a surface nobody can work on offline.
 */
const SEARCH_API_URL = process.env.SEARCH_API_URL;

/**
 * Shared secret for the query plane, when it wants one.
 *
 * Server-side only — it is read here, in a route handler, and never reaches the
 * browser. That is the other reason this route proxies rather than letting the
 * client call the API directly: a token the browser holds is a token anybody
 * holds.
 */
const SEARCH_API_TOKEN = process.env.SEARCH_API_TOKEN;

/** One SSE stream carrying a single error, for failures before the proxy opens. */
function errorStream(message: string): Response {
	return new Response(
		frame({ type: "error", message }) + frame({ type: "done" }),
		{ headers: SSE_HEADERS },
	);
}

const SSE_HEADERS = {
	"content-type": "text/event-stream; charset=utf-8",
	"cache-control": "no-cache, no-transform",
	"x-accel-buffering": "no",
} as const;

async function proxy(query: string, signal: AbortSignal): Promise<Response> {
	let upstream: Response;
	try {
		upstream = await fetch(
			`${SEARCH_API_URL}/search?q=${encodeURIComponent(query)}`,
			{
				signal,
				headers: {
					accept: "text/event-stream",
					...(SEARCH_API_TOKEN
						? { authorization: `Bearer ${SEARCH_API_TOKEN}` }
						: {}),
				},
			},
		);
	} catch (error) {
		// The surface renders an error *frame*; a 502 from here would give it a
		// failed fetch and nothing to say about why.
		return errorStream(
			`The search service could not be reached. ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	if (upstream.status === 401) {
		// Named, because the generic message sends somebody to read pipeline code
		// when the actual fix is one environment variable on one of two hosts.
		return errorStream(
			"The search service rejected this deployment's credentials — SEARCH_API_TOKEN is missing or does not match the value set on the API.",
		);
	}

	if (!upstream.ok || !upstream.body) {
		return errorStream(`The search service answered ${upstream.status}.`);
	}

	// Passed straight through, unbuffered. Re-parsing and re-encoding the frames
	// here would add latency to exactly the property the stream exists for.
	return new Response(upstream.body, { headers: SSE_HEADERS });
}

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

	if (SEARCH_API_URL) return proxy(query, request.signal);

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

	return new Response(stream, { headers: SSE_HEADERS });
}
