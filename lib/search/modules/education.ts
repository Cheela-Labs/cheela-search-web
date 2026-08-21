import { duration, marked, named, str } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * The courses, with what each costs in hours.
 *
 * ## This is a list, not the design's path
 *
 * The education artboard draws a four-step *path* — failure models, then
 * replication, then Raft, then break something — ordered so each step depends
 * on the last. That ordering is a pedagogical judgement. Nothing publishes it,
 * and the results are ranked by relevance, not by prerequisite. Numbering a
 * relevance ranking `01 02 03 04` and calling it a path would assert a
 * dependency between four courses that have never heard of each other.
 *
 * So the numbers are gone and this is a list of courses with their real time
 * costs, which `Course.timeRequired` publishes and which is the single most
 * useful thing on the artboard.
 */
export function readEducation(run: SearchRun): ResultModule | null {
	const steps = marked(run.sources, "Course")
		.map((entry) => {
			const title = str(entry.node, "name") ?? entry.source.title;
			if (!title) return null;
			const seconds = duration(str(entry.node, "timeRequired"));
			const hours = seconds ? Math.round(seconds / 3600) : null;
			return {
				id: entry.source.id,
				title,
				provider:
					named(entry.node, "publisher") ??
					entry.source.domain.replace(/^www\./, ""),
				time:
					hours && hours > 0
						? `${hours}H`
						: (str(entry.node, "educationalLevel")?.toUpperCase() ?? undefined),
				url: entry.source.url,
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		.slice(0, 5);

	if (steps.length < 2) return null;

	return {
		kind: "education",
		steps,
		provenance:
			"COURSES AS EACH PROVIDER PUBLISHES THEM · RANKED, NOT SEQUENCED",
	};
}
