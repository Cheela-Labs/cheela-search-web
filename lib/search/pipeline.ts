import { fallbackBlocks, matchFixture } from "./corpus";
import type { AnswerBlock, Result, SearchResponse, Source } from "./types";

/**
 * The offline query plane: one `SearchResponse`, answered from the fixture
 * corpus.
 *
 * This exists so the surface runs in a checkout with no backend. `SEARCH_API_URL`
 * unset means `app/api/search/route.ts` calls this instead of proxying, and
 * nothing in `components/` can tell.
 *
 * It deliberately returns the **wire** shape rather than the view model, even
 * though the fixtures are authored in the view model and converting one to the
 * other here is backwards. The reason is that `runFromResponse` is then the only
 * path either mode takes: the offline route exercises the same mapping the real
 * API's response goes through, so a bug in that mapping shows up on a laptop
 * rather than only after a deploy. A fixture path that skipped it would be
 * testing something the product does not do.
 *
 * The event stream this replaced also simulated stage timings — 90ms to route,
 * 430 to search, 1.2s to fetch and extract, 2.2s to compose. Those are gone
 * with the stream, and they are not missed here: they described a latency
 * *shape* the surface can no longer render, and pretending otherwise with
 * setTimeout would make the offline mode slower than the real one for no gain.
 */

/** The answer block's text, as the wire carries it. */
function toText(blocks: AnswerBlock[]): string {
	const answer = blocks.find(
		(block): block is Extract<AnswerBlock, { kind: "answer" }> =>
			block.kind === "answer",
	);
	return answer?.text.trim() ?? "";
}

function toResult(source: Source): Result {
	return {
		id: source.id,
		url: source.url,
		domain: source.domain,
		path: source.path,
		title: source.title,
		snippet: source.passages[0]?.text.slice(0, 240) ?? "",
		image: source.image,
		// Plausible constants. Nothing offline ranks, so these exist to satisfy
		// the shape rather than to mean anything — and a fixture that carried
		// hand-tuned authority scores would invite somebody to read them as data.
		authority: 0.7,
		freshness: 0.5,
		swatch: source.swatch,
		passages: source.passages,
		capabilities: source.capabilities,
		source: "index",
	};
}

export function runFixturePipeline(
	query: string,
	sessionId?: string,
): SearchResponse {
	const fixture = matchFixture(query);
	const sources = fixture?.sources ?? [];
	const blocks = fixture?.blocks ?? fallbackBlocks(query);

	return {
		answer: toText(blocks),
		results: sources.map(toResult),
		// Capability chips in the corpus are attached to their source, which is
		// where the real API puts them too. Nothing here registers a capability
		// of its own, so the top-level list is empty.
		capabilities: [],
		// Empty, and it is not an omission. The surface no longer renders
		// citations — a result is a link now rather than a footnote — so there
		// are no `[n]` markers in the fixtures to derive them from. The key stays
		// on the envelope because the real API still sends it.
		citations: [],
		// The offline corpus has no sessions, so nothing is ever a follow-up.
		followUp: false,
		intent: {
			intent: fixture?.intent ?? "information",
			confidence: fixture ? 0.9 : 0,
			entities: [],
		},
		entities: [],
		sessionId: sessionId ?? "offline",
		meta: {
			latencyMs: 0,
			servedFrom: "index",
			hypotheses: [query],
			// Named so the surface can say, and anyone reading a response can see,
			// that this did not come from a search engine.
			degraded: ["fixture-corpus"],
		},
	};
}
