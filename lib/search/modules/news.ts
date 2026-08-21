import { ago, fromEpoch } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * What happened, in the order it happened.
 *
 * The only module here that needed no new field on the wire: `publishedAt` and
 * `domain` have been on every result since the contract was written. The intent
 * engine already treats these queries differently — `freshnessHalfLife` gives
 * news two days against a year's default — so the ranking is already a
 * timeline. This draws it as one.
 *
 * Three dated results are the floor. Two is not a timeline, it is two results
 * with dates on them, and the rail says that better.
 *
 * Dates are coarse on purpose. `ago()` rounds to the hour and then to the day,
 * because a `datePublished` is trustworthy to about the day and a CMS that
 * stamps build time would otherwise be reported to the minute.
 */

/** Newer than this and the design calls the story developing. */
const DEVELOPING_MS = 6 * 3600 * 1000;

export function readNews(run: SearchRun): ResultModule | null {
	const now = new Date();
	const dated = run.sources
		.map((source) => {
			const when = fromEpoch(source.publishedAt);
			return when ? { source, when } : null;
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		// Newest first. The rail is in rank order and stays that way; a timeline
		// that is not in time order is not a timeline.
		.sort((a, b) => b.when.getTime() - a.when.getTime());

	if (dated.length < 3) return null;

	return {
		kind: "news",
		items: dated.slice(0, 6).map(({ source, when }) => ({
			id: source.id,
			when: ago(when, now),
			fresh: now.getTime() - when.getTime() < DEVELOPING_MS,
			title: source.title,
			outlet: source.domain.replace(/^www\./, "").toUpperCase(),
			url: source.url,
		})),
		provenance: `${new Set(dated.map((entry) => entry.source.domain)).size} OUTLETS · DATES AS EACH PUBLISHED THEM`,
	};
}
