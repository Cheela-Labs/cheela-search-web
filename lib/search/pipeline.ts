import { fallbackBlocks, matchFixture } from "./corpus";
import type { SearchEvent } from "./types";

/**
 * The query pipeline, as a stream of events.
 *
 * Stage boundaries follow the latency budget in `apps/search-api/PLAN.md`, and
 * the ordering is the part worth preserving when this is replaced by the real
 * thing:
 *
 *   route 0→90ms · upstream search 90→520 · capability lookup 520→580
 *   fetch+extract 520→1700 · rerank 1700→2050 · compose 2050→4300
 *
 * The capability lookup is a hash join on domains that have already arrived,
 * so it finishes an order of magnitude before composition does. That is why
 * "this site can do X" is emitted ahead of the first answer block rather than
 * alongside it — the surface renders the action before the answer because the
 * pipeline genuinely knows it first, not as a presentation trick.
 *
 * Timings are held here rather than in the client so that a real backend
 * inherits the contract by emitting the same events at its own pace, and the
 * surface needs no change to track it.
 */

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function* runPipeline(
	query: string,
	signal?: AbortSignal,
): AsyncGenerator<SearchEvent> {
	const fixture = matchFixture(query);
	const aborted = () => signal?.aborted === true;

	yield {
		type: "stage",
		stage: { id: "search", state: "active", label: "Searching the web" },
	};

	await sleep(90);
	if (aborted()) return;

	yield { type: "intent", intent: fixture?.intent ?? "informational" };

	await sleep(430);
	if (aborted()) return;

	const crawled = fixture?.crawled ?? 0;
	yield { type: "crawled", count: crawled };
	yield {
		type: "stage",
		stage: {
			id: "search",
			state: "done",
			label: crawled
				? `Searched ${crawled} sources`
				: "Searched the index — no candidates",
		},
	};

	// Capability lookup. Only surfaced when it found something: a line saying
	// "0 capabilities" on every informational query is noise on the overwhelming
	// majority of traffic, and the absence of a manifest is the normal case for
	// almost every domain on the web.
	const capability = fixture?.blocks.find(
		(block) => block.kind === "action" && block.capability,
	);
	if (capability?.kind === "action" && capability.capability) {
		yield {
			type: "stage",
			stage: {
				id: "capability",
				state: "active",
				label: "Checking what these sites can do",
			},
		};
		await sleep(60);
		if (aborted()) return;
		yield {
			type: "stage",
			stage: {
				id: "capability",
				state: "done",
				label: `1 capability on ${capability.capability.domain}`,
			},
		};
	}

	const sources = fixture?.sources ?? [];

	yield {
		type: "stage",
		stage: { id: "read", state: "active", label: "Reading pages" },
	};

	// Sources land as each fetch and extraction completes, not in one batch —
	// the rail fills progressively, which is what the skeletons in the design
	// are placeholders for.
	const perSource = sources.length ? 1120 / sources.length : 0;
	for (const source of sources) {
		await sleep(perSource);
		if (aborted()) return;
		yield { type: "source", source };
	}
	if (!sources.length) await sleep(400);
	if (aborted()) return;

	yield {
		type: "stage",
		stage: {
			id: "read",
			state: "done",
			label: sources.length
				? `Read ${sources.length} relevant page${sources.length === 1 ? "" : "s"}`
				: "Read 0 pages",
		},
	};

	await sleep(350);
	if (aborted()) return;

	yield {
		type: "stage",
		stage: { id: "compose", state: "active", label: "Synthesizing answer" },
	};

	await sleep(320);
	if (aborted()) return;

	const blocks = fixture?.blocks ?? fallbackBlocks(query);
	for (const block of blocks) {
		yield { type: "block", block };
		await sleep(380);
		if (aborted()) return;
	}

	yield {
		type: "stage",
		stage: { id: "compose", state: "done", label: "Answer composed" },
	};
	yield { type: "done" };
}
