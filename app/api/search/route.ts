import { runFixturePipeline } from "@/lib/search/pipeline";
import type { SearchResponse } from "@/lib/search/types";

/**
 * The query endpoint, as one JSON response.
 *
 * This is the seam, and it is both halves of it. With `SEARCH_API_URL` set it
 * proxies `apps/search-api`; without it, it answers from the fixture corpus in
 * `lib/search/pipeline.ts`. Nothing in `components/` knows the difference,
 * because the surface only ever knew about `SearchResponse`.
 *
 * Proxied rather than called from the browser. The API's CORS allowlist would
 * permit a direct call, but going through here keeps the request same-origin,
 * keeps the API's URL server-side, and — the reason that actually decides it —
 * keeps `SEARCH_API_TOKEN` on the server. A token the browser holds is a token
 * anybody holds.
 *
 * POST rather than GET, and a body rather than a query string, because the
 * session id is what makes a follow-up resolvable and a session id in a URL is
 * a session id in every access log on the way here.
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
 * Shared secret for the query plane. Server-side only: it is read here, in a
 * route handler, and never reaches the browser.
 */
const SEARCH_API_TOKEN = process.env.SEARCH_API_TOKEN;

function fail(message: string, status: number): Response {
	return Response.json({ error: message }, { status });
}

async function proxy(
	body: { query: string; sessionId?: string },
	signal: AbortSignal,
): Promise<Response> {
	let upstream: Response;
	try {
		upstream = await fetch(`${SEARCH_API_URL}/search`, {
			method: "POST",
			signal,
			headers: {
				"content-type": "application/json",
				...(SEARCH_API_TOKEN
					? { authorization: `Bearer ${SEARCH_API_TOKEN}` }
					: {}),
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		return fail(
			`The search service could not be reached. ${
				error instanceof Error ? error.message : String(error)
			}`,
			502,
		);
	}

	if (upstream.status === 401) {
		// Named, because the generic message sends somebody to read pipeline code
		// when the actual fix is one environment variable on one of two hosts.
		return fail(
			"The search service rejected this deployment's credentials — SEARCH_API_TOKEN is missing or does not match the value set on the API.",
			502,
		);
	}

	if (upstream.status === 404) {
		// A 404 is not "the search service is broken". `/search` is the only
		// route this ever calls, and search-api answers it — so a 404 means
		// SEARCH_API_URL is addressing something that is not search-api.
		//
		// It is worth naming because the wrong value looks right. Pointing this
		// at the main platform API gets a healthy `/health`, a valid TLS
		// certificate and a 200 on the front page; only `/search` is missing.
		// Diagnosed from the generic message, that reads as a search outage
		// rather than as one environment variable holding a sibling service's
		// hostname.
		return fail(
			`No /search route at ${SEARCH_API_URL} — SEARCH_API_URL is set to something that is not the search API. Its /health should report {"service":"search-api"}.`,
			502,
		);
	}

	if (upstream.status === 429) {
		return fail("Too many searches just now. Try again in a moment.", 429);
	}

	if (!upstream.ok) {
		return fail(`The search service answered ${upstream.status}.`, 502);
	}

	// Passed through as-is. The surface ignores fields it does not know, so the
	// API is free to add to the envelope without a release here.
	const envelope = (await upstream.json()) as SearchResponse;
	return Response.json(envelope);
}

export async function POST(request: Request): Promise<Response> {
	const body = await request.json().catch(() => null);
	const query =
		typeof (body as { query?: unknown } | null)?.query === "string"
			? (body as { query: string }).query.slice(0, MAX_QUERY_LENGTH)
			: "";

	if (!query.trim()) return fail("Missing query", 400);

	const sessionId =
		typeof (body as { sessionId?: unknown } | null)?.sessionId === "string"
			? (body as { sessionId: string }).sessionId.slice(0, 128)
			: undefined;

	if (SEARCH_API_URL) {
		return proxy(
			{ query, ...(sessionId ? { sessionId } : {}) },
			request.signal,
		);
	}

	/*
	 * The fixture corpus is a development convenience and nothing else.
	 *
	 * Left reachable in production it is worse than an outage: a search engine
	 * answering confidently out of a file of invented sources, with citations
	 * that resolve and an answer that reads exactly like a real one. The reader
	 * has no way to tell, and neither does anyone debugging it — a missing
	 * environment variable would present as "search works, results are odd"
	 * rather than as a missing environment variable.
	 *
	 * So the one deployment where it must not run is the one that refuses.
	 *
	 * Read here rather than at module scope on purpose: `next build` also runs
	 * with `NODE_ENV=production`, and a decision taken at module scope is taken
	 * on the build machine rather than on the one serving the request.
	 */
	if (process.env.NODE_ENV === "production") {
		return fail(
			"This deployment has no query plane configured — SEARCH_API_URL is unset. Refusing to answer from the offline fixture corpus.",
			503,
		);
	}

	return Response.json(runFixturePipeline(query, sessionId));
}
