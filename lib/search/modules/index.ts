import type { AnswerBlock, SearchResponse, SearchRun } from "../types";
import { readCoding } from "./coding";
import { readComparison } from "./comparison";
import { readDocs } from "./docs";
import { readEducation } from "./education";
import { readEntertainment } from "./entertainment";
import { readEntity } from "./entity";
import { readEvent } from "./event";
import { readHealth } from "./health";
import { readLocal } from "./local";
import { readNavigation } from "./navigation";
import { readNews } from "./news";
import { readResearch } from "./research";
import { readShopping } from "./shopping";
import { readUtility } from "./utility";
import { readVideo } from "./video";

/**
 * Which result module the classifier's intent gets, and whether it gets one.
 *
 * ## The rule
 *
 * A module renders when **the intent is confidently that one and the data its
 * primary element needs is actually present**. Either missing and there is no
 * module: the answer and the sources rail render exactly as they did before
 * this directory existed.
 *
 * This is what reconciles the design — twenty intents, twenty modules — with
 * the rule `types.ts` states at the top of the file, that the surface branches
 * on observable facts rather than on the intent so that a twenty-first intent
 * does not require a release here. It still does not: an intent this map has no
 * entry for falls through, and so does an intent whose reader abstains. The
 * fallback path never asks what the intent was.
 *
 * ## Four intents deliberately have no module
 *
 * `finance` needs an exchange feed, `sports` a scores feed, `travel` flight
 * pricing, `image` an image index. None of the four exists anywhere in this
 * system, and there is no honest card to draw without one. A quote box with no
 * quote in it is worse than no quote box: it says the feature exists and is
 * broken, when the truth is that it was never built.
 *
 * `image` is the one worth being explicit about, because it looks buildable.
 * Every result carries an `og:image` and a grid of them would render. It would
 * also be a lie, for the reason `places-grid.tsx` sets out at length: an
 * `og:image` is a page's hero, not a picture of what was searched for.
 *
 * ## Why the readers abstain so often
 *
 * Most of these read schema.org markup, and most pages publish none. A reader
 * returning `null` is the normal case, not a failure — which is exactly why
 * `test/modules.test.ts` asserts each one's refusals as carefully as its
 * successes. A reader that silently stopped working would look identical to the
 * web simply not having published anything.
 */

export type Fact = { label: string; value: string };

export type ResultModule =
	| {
			kind: "entity";
			/** `ENTITY · SOFTWARE` — the graph's node type, in the design's eyebrow. */
			label: string;
			name: string;
			description: string;
			facts: Fact[];
			url?: string;
			favicon?: string;
			/** The publisher's own list of their other profiles. */
			sameAs: string[];
			provenance: string;
	  }
	| {
			kind: "event";
			name: string;
			start: Date;
			end?: Date;
			venue?: string;
			locality?: string;
			chips: string[];
			facts: Fact[];
			url?: string;
			provenance: string;
	  }
	| {
			kind: "shopping";
			name: string;
			image?: string;
			brand?: string;
			description?: string;
			rating?: { value: string; count?: string };
			offers: {
				seller: string;
				price: string;
				availability?: string;
				url?: string;
			}[];
			provenance: string;
	  }
	| {
			kind: "docs";
			title: string;
			trail: string[];
			sections: string[];
			body: string;
			facts: Fact[];
			url: string;
			provenance: string;
	  }
	| {
			kind: "navigation";
			name: string;
			domain: string;
			url: string;
			favicon?: string;
			links: { label: string; url: string }[];
			provenance: string;
	  }
	| {
			kind: "local";
			venues: {
				name: string;
				address?: string;
				telephone?: string;
				hours?: string;
				url?: string;
			}[];
			provenance: string;
	  }
	| {
			kind: "news";
			items: {
				id: string;
				when: string;
				fresh: boolean;
				title: string;
				outlet: string;
				url: string;
			}[];
			provenance: string;
	  }
	| {
			kind: "comparison";
			subjects: string[];
			rows: { criterion: string; cells: string[]; best: number[] }[];
	  }
	| {
			kind: "video";
			title: string;
			thumbnail?: string;
			by?: string;
			length?: string;
			uploaded?: string;
			chapters: { at: string; label: string }[];
			url: string;
			provenance: string;
	  }
	| {
			kind: "research";
			papers: {
				id: string;
				title: string;
				by?: string;
				year?: string;
				url: string;
			}[];
			provenance: string;
	  }
	| {
			kind: "health";
			reviewedBy?: string;
			lastReviewed?: string;
			domains: string[];
			provenance: string;
	  }
	| {
			kind: "entertainment";
			title: string;
			poster?: string;
			meta: string[];
			chips: string[];
			description?: string;
			where: { name: string; detail?: string; url?: string }[];
			provenance: string;
	  }
	| {
			kind: "education";
			steps: {
				id: string;
				title: string;
				provider?: string;
				time?: string;
				url: string;
			}[];
			provenance: string;
	  }
	| {
			kind: "coding";
			title?: string;
			language?: string;
			code: string;
			url: string;
			provenance: string;
	  }
	/**
	 * The one module with no provenance line.
	 *
	 * Every other card here ends with one because everything above it is a
	 * publisher's claim about their own page, and saying whose claim it is is
	 * the whole honesty mechanism. A conversion has no source to attribute — it
	 * is arithmetic — so a footer reading "COMPUTED LOCALLY · NO SOURCES
	 * NEEDED" was answering a question nobody asked and taking a line of the
	 * card to do it.
	 */
	| {
			kind: "utility";
			from: { value: string; unit: string };
			to: { value: string; unit: string };
			alternates: Fact[];
	  };

export type ModuleBlock = Extract<AnswerBlock, { kind: "module" }>;

/**
 * The map, and the whole of the intent-to-interface wiring.
 *
 * `action` is absent because it already has one: `ActionCard` in `blocks.tsx`
 * has rendered capability hits since the surface was built, and a second card
 * for the same data would be two answers to one question.
 */
const READERS: Partial<
	Record<
		string,
		(run: SearchRun, response: SearchResponse) => ResultModule | null
	>
> = {
	information: readEntity,
	event: readEvent,
	shopping: readShopping,
	documentation: readDocs,
	navigation: readNavigation,
	local: readLocal,
	news: readNews,
	comparison: readComparison,
	video: readVideo,
	research: readResearch,
	health: readHealth,
	entertainment: readEntertainment,
	education: readEducation,
	coding: readCoding,
	utility: readUtility,
};

export function selectModule(
	run: SearchRun,
	response: SearchResponse,
): ModuleBlock | null {
	// `run.intent` is already gated — `runFromResponse` reduced anything below
	// `CONFIDENT` to `information` — so there is no second threshold here.
	const intent = run.intent?.intent;
	if (!intent) return null;

	const read = READERS[intent];
	if (!read) return null;

	// A reader is given a whole response and a whole run. It is allowed to look
	// at anything; what it may not do is invent. Every one of them returns
	// `null` rather than a module with a hole in it.
	let module: ResultModule | null = null;
	try {
		module = read(run, response);
	} catch {
		// A reader walking a stranger's markup is the one place here that can
		// throw on shape. Losing the module is the correct cost; losing the
		// answer it sits under is not.
		return null;
	}

	return module
		? { kind: "module", id: `module-${module.kind}`, module }
		: null;
}
