/**
 * The contract between the query plane and the surface that renders it.
 *
 * `apps/search-api` answers `POST /search` with one JSON envelope —
 * `SearchResponse` below, mirroring that service's `src/contracts/search.ts`.
 * The two files are deliberately duplicated rather than shared through a
 * package: each app builds standalone from its own subtree mirror, where a
 * `workspace:` dependency cannot resolve, and a published package would put an
 * npm release between every contract change and the two apps that need it.
 *
 * `SearchRun` is the surface's own view model and is *not* the wire format.
 * `runFromResponse` is the one place the two meet, which is what kept the
 * migration off server-sent events from reaching any component: the envelope
 * changed shape completely and every component below still reads the same
 * fields it always did.
 *
 * What was lost in that migration is worth naming rather than discovering: the
 * old stream delivered sources roughly two seconds before the answer, so the
 * surface could draw citations while composition was still running. One
 * buffered response cannot do that. The progress trace went with it, because a
 * trace of a request that arrives all at once has nothing to trace.
 */

/**
 * Query intents, as both specification documents enumerate them.
 *
 * Twenty values where this file used to have four. The surface treats them as
 * an open set on purpose — it renders the label and otherwise branches on
 * observable facts rather than on the intent, because a classifier that gains a
 * twenty-first value should not require a release here to keep rendering.
 */
export type Intent =
	| "information"
	| "event"
	| "shopping"
	| "documentation"
	| "navigation"
	| "action"
	| "local"
	| "news"
	| "comparison"
	| "image"
	| "video"
	| "research"
	| "finance"
	| "health"
	| "travel"
	| "sports"
	| "entertainment"
	| "education"
	| "coding"
	| "utility";

/** A run of answer text, or a citation marker pointing at a source's number. */
export type Span = { kind: "text"; text: string } | { kind: "cite"; n: number };

export type ComparisonRow = {
	label: string;
	cells: string[];
};

/**
 * A unit of the answer. The design builds the answer upward from the bar as
 * discrete bubbles, so a block is both the composition unit and the animation
 * unit — each one enters once, on arrival, and never re-animates.
 */
export type AnswerBlock =
	| { kind: "answer"; id: string; spans: Span[] }
	| { kind: "note"; id: string; label: string; spans: Span[] }
	| {
			kind: "comparison";
			id: string;
			label: string;
			columns: string[];
			rows: ComparisonRow[];
	  }
	| {
			kind: "action";
			id: string;
			label: string;
			prompt: string;
			cta: string;
			/**
			 * Present when the action is backed by a capability from a site's
			 * `/.well-known/agent-discovery.json`. Absent means the card is a
			 * suggested follow-up query and nothing external is called.
			 */
			capability?: CapabilityRef;
	  }
	| { kind: "suggestions"; id: string; label: string; queries: string[] };

/**
 * A capability the answer can offer to run.
 *
 * `callable` is ours to decide, never the manifest's: a transport we do not
 * speak or an effects tier above `read` still gets indexed and shown, it just
 * cannot be invoked from here. Rendering it either way is the point — a
 * capability we cannot call is still a useful search result.
 */
export type CapabilityRef = {
	domain: string;
	invocationName: string;
	effects:
		| "read"
		| "write-reversible"
		| "write-irreversible"
		| "financial"
		| "unknown";
	callable: boolean;
};

export type Passage = {
	id: string;
	text: string;
	/** Cited passages are highlighted in the evidence panel; the rest are context. */
	cited: boolean;
};

export type Source = {
	id: string;
	/** The citation number rendered in superscripts and on the rail card. */
	n: number;
	domain: string;
	/** Display path shown under the title in the evidence panel header. */
	path: string;
	url: string;
	title: string;
	/**
	 * One or two lines about the page, for the results rail.
	 *
	 * The API's own summary where it has one — a vendor's for an external
	 * result, ours for an indexed one — and the first extracted passage where
	 * it does not. Deliberately not the *cited* passage: this describes the
	 * page, and the evidence panel is where what the answer used is shown.
	 *
	 * Optional because a result can genuinely have neither — and because the
	 * fixture corpus authors its sources in this shape without one. Those go
	 * out through `toResult`, which derives a snippet from the first passage,
	 * so the offline mode still exercises this row rather than skipping it.
	 */
	snippet?: string;
	/**
	 * A stable colour per domain, drawn behind the site's own favicon and left
	 * showing when there is not one.
	 *
	 * It used to be the icon rather than the backdrop, on the reasoning that a
	 * real favicon is a third-party image request on every result — a tracking
	 * surface and a layout-shift source — and a hashed colour is neither. The
	 * first half of that still holds, and is why `/api/favicon` proxies rather
	 * than pointing at a favicon service; the second stopped holding the moment
	 * a result set came back from two domains whose hues were 26° apart and
	 * twenty results rendered as one repeated green square.
	 *
	 * Under the image, not beside it: whichever of the two the reader sees
	 * occupies the same cell at the same size, so a miss reflows nothing.
	 */
	swatch: string;
	/**
	 * The source page's own `og:image`, when it declared one — absent on roughly
	 * a fifth of pages, so nothing may depend on it.
	 *
	 * This is the page's *self-description*, taken from the page this card links
	 * to. It is not a product photo matched to the link from somewhere else, and
	 * it carries no promise of being a product at all: on a storefront it is
	 * usually the shop's own hero image or logo.
	 */
	image?: string;
	capturedLabel?: string;
	passages: Passage[];
	/**
	 * What this domain says it can do, from its ADS manifest.
	 *
	 * Usually absent — most of the web publishes no manifest. Read from an index
	 * the query plane fills out of band, never fetched while a query is running,
	 * so these arrive with the source rather than after the answer.
	 *
	 * **Nothing here is invocable from this surface.** `callable` says whether
	 * the query plane *could* speak the transport, which is information about
	 * the result, not an offer to act.
	 */
	capabilities?: CapabilityRef[];
};

/**
 * Somewhere to go, as opposed to something we read.
 *
 * A `Source` is evidence — it has passages, it carries a citation number, and
 * the answer may claim it said something. A `Place` is a destination and claims
 * nothing. It exists because the pages a discovery query most wants to show are
 * exactly the ones that cannot be read: storefronts render their catalogues in
 * JavaScript, so they extract to nothing while still publishing a complete
 * `<head>` with a title and an image.
 *
 * Nothing here is ever cited. That is why it is a separate type and not a flag.
 */
export type Place = {
	id: string;
	domain: string;
	/** Where the reader is sent. After redirects, when there were any. */
	url: string;
	title: string;
	swatch: string;
	/** The page's own `og:image`, when it declared one. */
	image?: string;
};

/**
 * The `POST /search` envelope, mirroring apps/search-api's
 * `src/contracts/search.ts`.
 *
 * The first five keys are the specification's; the rest are a documented
 * superset that service adds. Fields the surface does not know are ignored
 * rather than rejected, which is the direction that survives the API shipping
 * before this app does.
 */
export type SearchResponse = {
	answer: string;
	results: Result[];
	capabilities: CapabilityHit[];
	citations: Citation[];
	followUp: boolean;
	intent: { intent: Intent; confidence: number; entities: string[] };
	entities: { id: string; name: string; type: string }[];
	sessionId: string;
	meta: {
		latencyMs: number;
		servedFrom: "index" | "external" | "mixed";
		hypotheses: string[];
		degraded: string[];
	};
};

export type Result = {
	id: string;
	url: string;
	domain: string;
	path: string;
	title: string;
	snippet: string;
	image?: string;
	authority: number;
	freshness: number;
	publishedAt?: number;
	swatch: string;
	passages: Passage[];
	capabilities?: CapabilityRef[];
	source: "index" | "external";
};

export type CapabilityHit = {
	id: string;
	domain: string;
	invocationName: string;
	title: string;
	description: string;
	provider: string;
	auth: string;
	effects: CapabilityRef["effects"];
	callable: boolean;
	score: number;
};

export type Citation = {
	n: number;
	resultId: string;
	url: string;
	title: string;
};

/** Everything the surface accumulates for one query. */
export type SearchRun = {
	query: string;
	intent: Intent | null;
	sources: Source[];
	/**
	 * Destinations rather than evidence: results with no readable passages.
	 *
	 * The pages a shopping or navigation query most wants to show are exactly
	 * the ones that cannot be read — storefronts render their catalogue in
	 * JavaScript, so they extract to nothing while still publishing a complete
	 * `<head>`. Dropping them would leave the reader with an encyclopedia
	 * article, so they are shown as places and never cited.
	 */
	places: Place[];
	blocks: AnswerBlock[];
	/**
	 * The named parts of the query plane that failed without failing the
	 * request, from `meta.degraded`.
	 *
	 * Carried into the view model because a response can be a complete success
	 * at the HTTP layer and still contain nothing — every retrieval path can
	 * time out and the envelope still arrives, 200, with an empty answer and no
	 * results. Without this the surface renders that as a blank page, which
	 * reads as a bug in the surface rather than as what it is.
	 */
	degraded: string[];
	status: "idle" | "running" | "done" | "error";
	error?: string;
};

export function emptyRun(query: string): SearchRun {
	return {
		query,
		intent: null,
		sources: [],
		places: [],
		blocks: [],
		degraded: [],
		status: "running",
	};
}

/**
 * Turns one envelope into the view model the components already read.
 *
 * This is the whole of the server-sent-events migration. The wire format
 * changed completely; every component below reads the same fields it did
 * before, because this function absorbs the difference.
 *
 * Two mappings deserve a word:
 *
 * - The answer arrives as a string with `[1]` markers and a separate citation
 *   list. It becomes an `answer` block of spans, because the surface renders
 *   citations as interactive elements and cannot do that with a string.
 * - A result with no passages becomes a `Place` rather than a `Source`. A
 *   source is evidence and the answer is allowed to claim it said something; a
 *   place is somewhere to go and makes no such claim.
 */
export function runFromResponse(
	query: string,
	response: SearchResponse,
): SearchRun {
	const evidence = response.results.filter(
		(result) => result.passages.length > 0,
	);
	const destinations = response.results.filter(
		(result) => result.passages.length === 0,
	);

	// Citation numbers are assigned over the *evidence* only, so `[2]` in the
	// answer and the second card in the rail are the same source. Numbering over
	// all results would silently skip the ones that became places.
	const numbering = new Map(
		evidence.map((result, index) => [result.id, index + 1]),
	);

	const sources: Source[] = evidence.map((result, index) => ({
		id: result.id,
		n: index + 1,
		domain: result.domain,
		path: result.path,
		url: result.url,
		title: result.title,
		snippet: result.snippet || (result.passages[0]?.text ?? ""),
		swatch: result.swatch,
		image: result.image,
		passages: result.passages,
		capabilities: result.capabilities,
	}));

	const places: Place[] = destinations.map((result) => ({
		id: result.id,
		domain: result.domain,
		url: result.url,
		title: result.title,
		snippet: result.snippet || (result.passages[0]?.text ?? ""),
		swatch: result.swatch,
		image: result.image,
	}));

	const blocks: AnswerBlock[] = [];
	if (response.answer) {
		blocks.push({
			kind: "answer",
			id: "answer",
			spans: toSpans(response.answer, response.citations, numbering),
		});
	}

	for (const capability of response.capabilities) {
		blocks.push({
			kind: "action",
			id: `action-${capability.id}`,
			label: capability.provider,
			prompt: capability.description,
			cta: capability.title,
			capability: {
				domain: capability.domain,
				invocationName: capability.invocationName,
				effects: capability.effects,
				callable: capability.callable,
			},
		});
	}

	return {
		query,
		intent: response.intent?.intent ?? null,
		sources,
		places,
		blocks,
		// Optional-chained because the surface ignores fields it does not know
		// and must survive an envelope that predates this one.
		degraded: response.meta?.degraded ?? [],
		status: "done",
	};
}

/**
 * Splits answer text on its `[n]` markers into text and citation spans.
 *
 * A marker whose number the citation list does not account for is dropped from
 * the output rather than rendered. A citation the reader cannot follow is worse
 * than no citation, because it looks like one.
 */
export function toSpans(
	answer: string,
	citations: Citation[],
	numbering: Map<string, number>,
): Span[] {
	const known = new Set<number>();
	for (const citation of citations) {
		const n = numbering.get(citation.resultId);
		if (n !== undefined) known.add(n);
		// The API numbers citations itself; when that agrees with ours, both are
		// present in the set and the marker renders either way.
		known.add(citation.n);
	}

	const spans: Span[] = [];
	let cursor = 0;
	const pattern = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

	for (let match = pattern.exec(answer); match; match = pattern.exec(answer)) {
		const numbers = match[1]
			.split(",")
			.map((entry) => Number(entry.trim()))
			.filter((n) => known.has(n));

		if (numbers.length === 0) continue;

		if (match.index > cursor) {
			spans.push({ kind: "text", text: answer.slice(cursor, match.index) });
		}
		for (const n of numbers) spans.push({ kind: "cite", n });
		cursor = match.index + match[0].length;
	}

	if (cursor < answer.length) {
		spans.push({ kind: "text", text: answer.slice(cursor) });
	}
	return spans;
}
