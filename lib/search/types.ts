import { type ResultModule, selectModule } from "./modules";

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

/**
 * The line below which an intent is a guess rather than a finding.
 *
 * Duplicated from `apps/search-api/src/contracts/intent.ts`, the same
 * deliberate duplication as the wire types below and for the same reason. That
 * the two agree matters more than it looks: the API sends the **ungated**
 * classification. Its orchestrator computes `actOn(classification)` and ranks
 * with it, then puts `classification.intent` on the wire untouched — so a
 * response can name an intent the ranker itself refused to act on. Reading it
 * raw would draw a shopping module over results ranked as `information`.
 */
export const CONFIDENT = 0.55;

/** A run of answer text, or a citation marker pointing at a source's number. */
export type Span = { kind: "text"; text: string } | { kind: "cite"; n: number };

export type ComparisonRow = {
	label: string;
	cells: string[];
	/**
	 * Indexes of the columns the sources favour on this row. Often empty, and
	 * empty is a real answer: "the sources do not take a side" is information,
	 * and a highlighted cell where nobody took one is not.
	 */
	best?: number[];
};

/**
 * The wire form of a comparison, mirroring `services/generator`'s `Comparison`.
 *
 * Composed from the sources rather than read off any one of them, which is why
 * it arrives on its own key and why the card that renders it says so.
 */
export type Comparison = {
	subjects: string[];
	rows: { criterion: string; cells: string[]; best: number[] }[];
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
	| { kind: "suggestions"; id: string; label: string; queries: string[] }
	/**
	 * The result module the classifier's intent earned, when it earned one.
	 *
	 * One variant rather than fifteen, because the shell's concern is that a
	 * module is a block like any other — it enters once, in the stack, at the
	 * same 720px the design drew it at. Which module, and whether there is one
	 * at all, is decided in `lib/search/modules`.
	 */
	| { kind: "module"; id: string; module: ResultModule };

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

/**
 * One schema.org node a page published about itself, pruned to what this
 * surface reads.
 *
 * Mirrors `apps/search-api/src/services/structured/index.ts`, which does the
 * parsing. It arrives already flattened, already type-whitelisted, already
 * capped, and with every URL-shaped value validated to http(s) — none of which
 * this app should be doing to a stranger's JSON on the render path.
 *
 * **This is a publisher's claim about their own page, not a fact.** A page can
 * say its `Product` costs anything it likes. The modules render it attributed
 * to the domain it came from, which is the only honest frame for it, and never
 * aggregate it into a number of our own.
 */
export type StructuredValue = string | string[] | StructuredNode[];

export type StructuredNode = {
	/** The normalised `@type`. One of the whitelist the API maintains. */
	type: string;
	props: Record<string, StructuredValue>;
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
	 * capability the query plane *could* speak the transport, which is
	 * information about the result, not an offer to act.
	 */
	capabilities?: CapabilityRef[];
	/** What this page said about itself in JSON-LD. The modules read this. */
	structured?: StructuredNode[];
	/** The page's own meta description. */
	description?: string;
	/** The page's own heading outline — the only structure most docs publish. */
	headings?: string[];
	/** Seconds since epoch, when the page declared a date. */
	publishedAt?: number;
	/**
	 * Whether a provider returned this rather than our index.
	 *
	 * Carried because it explains an absence rather than because it ranks: an
	 * external result has no passages and no markup, and the evidence panel has
	 * to say so rather than render an empty column.
	 *
	 * Optional, and absent reads as "from the index". The fixture corpus authors
	 * its sources by hand with passages already written, so requiring the flag
	 * there would be seven restatements of the same false.
	 */
	external?: boolean;
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
	/**
	 * The vendor's or the page's own one-line summary.
	 *
	 * Declared because it was already being assigned: `runFromResponse` set it
	 * on every place while the type did not admit it, which compiles only
	 * because inference through `.map` skips the excess-property check. Present
	 * in the type is better than present by accident.
	 */
	snippet?: string;
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
	/** Additive. Present only on a comparison query the model answered in shape. */
	comparison?: Comparison;
	intent: {
		intent: Intent;
		confidence: number;
		entities: string[];
		/** Where a navigational query resolved to, when the structural pass did. */
		officialDomain?: string;
		officialUrl?: string;
	};
	entities: EntityRef[];
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
	/**
	 * schema.org nodes this page published about itself. Additive; absent on
	 * every external result, because a provider returns a link and we never
	 * fetched the page to read its markup.
	 */
	structured?: StructuredNode[];
	/** The page's own `<meta name="description">`, when it had one. */
	description?: string;
	/** H1-H6 in document order: the author's own outline of the page. */
	headings?: string[];
};

/**
 * A thing the graph knows about, as the API resolves it.
 *
 * Everything below `type` is additive and recently so: the registry selected
 * five columns for a long time and the surface could therefore render a name
 * and a type, which describes nothing. `description` is what makes a knowledge
 * card possible at all.
 */
export type EntityRef = {
	id: string;
	name: string;
	type: string;
	aliases?: string[];
	popularity?: number;
	description?: string;
	/** Apex form, `www.` stripped. Which domain officially speaks for this name. */
	officialDomain?: string;
	officialUrl?: string;
	faviconUrl?: string;
	/** The publisher's own list of their other profiles, from schema.org `sameAs`. */
	sameAs?: string[];
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
	/**
	 * The classification, gated.
	 *
	 * `intent` is what the query plane actually ranked with — `information`
	 * whenever `confidence` fell below `CONFIDENT`, exactly as the API's own
	 * `actOn()` decides it. `confidence` is carried unrounded so a surface can
	 * tell "confidently informational" from "we had no idea".
	 */
	intent: {
		intent: Intent;
		confidence: number;
		/** Where a navigational query resolved, when the structural pass did. */
		officialDomain?: string;
		officialUrl?: string;
	} | null;
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
	/** What the graph knows about the names in the query. Often empty. */
	entities: EntityRef[];
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
		entities: [],
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
 * Three mappings deserve a word:
 *
 * - The answer arrives as a string with `[1]` markers and a separate citation
 *   list. It becomes an `answer` block of spans, because the surface renders
 *   citations as interactive elements and cannot do that with a string.
 * - Citation numbers are assigned over **every** result, in the order the API
 *   returned them. See `numbering` below — this is not a stylistic choice.
 * - A result with no passages is still a source. It is *additionally* a place
 *   when it has an image, because a storefront that extracted to nothing still
 *   published a picture and a title, and that is what a discovery query wants.
 */
export function runFromResponse(
	query: string,
	response: SearchResponse,
): SearchRun {
	const results = response.results;

	/*
	  Numbered over every result, in API order, because that is the numbering
	  the answer's own `[n]` markers already use.

	  The generator fences `input.results.slice(0, 8)` and labels each one
	  `n="${index + 1}"`, then `extractCitations` maps a marker straight back
	  through `results[n - 1]`. Both are indexes into `results`.

	  This used to number over a *filtered* list — the results that had
	  passages — while `toSpans` went on emitting the marker number as written
	  in the answer text, and `blocks.tsx` matched that against the rail's
	  number. The two lists agree only while every result has passages, and
	  every `source: "external"` result has none: the retriever gives them
	  `chunks: []`, so ranking derives no passages from them. One provider
	  result above a cited one shifted every number below it, and the reader
	  opened the wrong page from a citation that looked entirely correct.

	  A wrong citation is worse than a missing one, because it looks like one.
	*/
	const numbering = new Map(
		results.map((result, index) => [result.id, index + 1]),
	);

	const sources: Source[] = results.map((result, index) => ({
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
		structured: result.structured,
		description: result.description,
		headings: result.headings,
		publishedAt: result.publishedAt,
		external: result.source === "external",
	}));

	/*
	  Additive, not the complement of the rail.

	  These are the same results, shown a second way. A place still claims
	  nothing and is still never cited — that is why the type is separate — but
	  it is no longer *removed* from the rail to earn that, which is what left a
	  provider-answered query rendering a blank column beside a full response.

	  The image is the qualifier rather than the absence of passages: a card in
	  this grid is a picture and a title, and one without a picture is a rail
	  row that has been moved somewhere it reads worse.
	*/
	const places: Place[] = results
		.filter((result) => result.passages.length === 0 && Boolean(result.image))
		.map((result) => ({
			id: result.id,
			domain: result.domain,
			url: result.url,
			title: result.title,
			snippet: result.snippet || undefined,
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

	// Optional-chained throughout because the surface ignores fields it does not
	// know and must survive an envelope that predates this one.
	const classified = response.intent
		? {
				// Gated here rather than trusted, because the wire carries the raw
				// classification. Below the line the query plane ranked this as
				// `information`, so that is what the surface renders it as.
				intent:
					response.intent.confidence >= CONFIDENT
						? response.intent.intent
						: ("information" as Intent),
				confidence: response.intent.confidence,
				officialDomain: response.intent.officialDomain,
				officialUrl: response.intent.officialUrl,
			}
		: null;

	const run: SearchRun = {
		query,
		intent: classified,
		sources,
		places,
		entities: response.entities ?? [],
		blocks,
		degraded: response.meta?.degraded ?? [],
		status: "done",
	};

	/*
	  The module goes last, below the answer.

	  The design's own legend orders them — `PRIMARY ANSWER · DARK BUBBLE`, then
	  `SUPPORTING MODULE` — and its news and health artboards draw exactly that:
	  the dark bubble on top, the module under it. A module is what the answer is
	  standing on, not a replacement for it.

	  `selectModule` returns `null` far more often than not, and every reason it
	  does is a good one. See `lib/search/modules`.
	*/
	const module = selectModule(run, response);
	if (module) run.blocks = [...run.blocks, module];

	return run;
}

/**
 * Splits answer text on its `[n]` markers into text and citation spans.
 *
 * A marker whose number no result accounts for is dropped from the output
 * rather than rendered. A citation the reader cannot follow is worse than no
 * citation, because it looks like one.
 */
export type { ResultModule };

export function toSpans(
	answer: string,
	citations: Citation[],
	numbering: Map<string, number>,
): Span[] {
	/*
	  Our numbering only.

	  This used to also admit `citation.n` verbatim, so that a marker rendered
	  "either way" when the API's numbering and ours disagreed. They cannot
	  disagree any more — both are indexes into `results` — and while they could,
	  admitting both is what let a marker through to be matched against the wrong
	  rail card. A number we cannot place is a number we do not render.
	*/
	const known = new Set<number>();
	for (const citation of citations) {
		const n = numbering.get(citation.resultId);
		if (n !== undefined) known.add(n);
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
