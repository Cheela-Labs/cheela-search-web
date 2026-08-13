/**
 * The contract between the query pipeline and the surface that renders it.
 *
 * Everything here crosses a wire. `app/api/search/route.ts` currently answers
 * from a fixture corpus because the retrieval planes described in
 * `apps/search-api/PLAN.md` are not built yet — but the client
 * consumes a stream of these events and knows nothing about where they came
 * from, so replacing that handler with a proxy to the real search API is the
 * whole of the integration.
 *
 * The event ordering matters and is part of the contract: capability and
 * source events are emitted *before* the first answer block, because the
 * architecture's whole latency argument is that the capability lookup is a
 * hash join that completes long before composition does. A surface that waits
 * for the answer to draw its sources throws that away.
 */

/** Stages of the query pipeline, in the order they run. */
export type StageId =
	| "route"
	| "search"
	| "capability"
	| "read"
	| "rank"
	| "compose";

export type StageState = "pending" | "active" | "done";

/**
 * One line of the progress trace.
 *
 * The label is authored server-side rather than derived from the id, because
 * it changes tense as the stage completes — "Reading pages" becomes "Read 9
 * relevant pages" — and only the pipeline knows the counts.
 */
export type Stage = {
	id: StageId;
	state: StageState;
	label: string;
};

/**
 * Query intents, per the router. Only `action` may reach a third party, and
 * ambiguity is meant to resolve downward toward showing rather than doing.
 */
export type Intent = "navigational" | "informational" | "discovery" | "action";

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
	 * Stands in for a favicon. Real favicons are third-party image requests on
	 * every result, which is a tracking surface and a layout-shift source; a
	 * colour derived from the domain costs neither.
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

export type SearchEvent =
	| { type: "intent"; intent: Intent }
	| { type: "places"; places: Place[] }
	| { type: "stage"; stage: Stage }
	| { type: "crawled"; count: number }
	| { type: "source"; source: Source }
	| { type: "block"; block: AnswerBlock }
	| { type: "done" }
	| { type: "error"; message: string };

/** Everything the surface accumulates for one query. */
export type SearchRun = {
	query: string;
	intent: Intent | null;
	stages: Stage[];
	crawled: number;
	sources: Source[];
	/** Only ever populated for discovery queries. */
	places: Place[];
	blocks: AnswerBlock[];
	status: "idle" | "running" | "done" | "error";
	error?: string;
};

export function emptyRun(query: string): SearchRun {
	return {
		query,
		intent: null,
		stages: [],
		crawled: 0,
		sources: [],
		places: [],
		blocks: [],
		status: "running",
	};
}

/** Reduces one event into the accumulated run. Pure, so it is trivial to test. */
export function applyEvent(run: SearchRun, event: SearchEvent): SearchRun {
	switch (event.type) {
		case "intent":
			return { ...run, intent: event.intent };
		case "places":
			return { ...run, places: event.places };
		case "stage": {
			const stages = run.stages.some((s) => s.id === event.stage.id)
				? run.stages.map((s) => (s.id === event.stage.id ? event.stage : s))
				: [...run.stages, event.stage];
			return { ...run, stages };
		}
		case "crawled":
			return { ...run, crawled: event.count };
		case "source":
			// Guarded against duplicates so a retried frame cannot double a card.
			return run.sources.some((s) => s.id === event.source.id)
				? run
				: { ...run, sources: [...run.sources, event.source] };
		case "block":
			return run.blocks.some((b) => b.id === event.block.id)
				? run
				: { ...run, blocks: [...run.blocks, event.block] };
		case "done":
			return { ...run, status: "done" };
		case "error":
			return { ...run, status: "error", error: event.message };
	}
}
