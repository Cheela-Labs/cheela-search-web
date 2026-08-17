import type { SearchResponse } from "./types";

/**
 * Calls `/api/search`.
 *
 * A single POST returning one JSON envelope. This replaced a `fetch` plus a
 * hand-rolled server-sent-events frame parser, and the reason for the change is
 * the API's, not the surface's: `apps/search-api` answers `POST /search` with a
 * body, because the specification says so and because a session id belongs in a
 * body rather than in a URL that lands in every access log between here and the
 * browser.
 *
 * `signal` still matters as much as it did with the stream. A follow-up query
 * typed over a running one must abort the first — otherwise two responses race
 * and the slower one wins, so the answer on screen is for the previous query.
 */
export async function search(
	query: string,
	sessionId: string | null,
	signal: AbortSignal,
): Promise<SearchResponse> {
	const response = await fetch("/api/search", {
		method: "POST",
		signal,
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ query, ...(sessionId ? { sessionId } : {}) }),
	});

	if (!response.ok) {
		// The route handler answers errors as JSON with a message worth showing;
		// anything else gets the status, which is all there is to say.
		const detail = await response
			.json()
			.then((body: { error?: string }) => body.error)
			.catch(() => null);
		throw new Error(detail ?? `Search failed with ${response.status}`);
	}

	return (await response.json()) as SearchResponse;
}
