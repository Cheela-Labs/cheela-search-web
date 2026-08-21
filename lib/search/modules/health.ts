import { date, marked, named, str } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * Who reviewed this, and when.
 *
 * ## What this card is for
 *
 * The design's health artboard has two halves. The dark bubble carries the
 * caveat — `GENERAL INFORMATION · NOT A DIAGNOSIS` — and that is not here: it
 * is on the answer card itself, in `blocks.tsx`, where the prose it qualifies
 * actually is. A caveat in a separate card below the claim it applies to is a
 * caveat a reader scrolls past.
 *
 * The second half is the `SEE A CLINICIAN IF` list, and that is a composed
 * clinical judgement, not something any page publishes as markup. Producing one
 * would mean asking a model to write red flags and rendering them with the
 * authority of a checklist. That is out of scope by a long way, and it is the
 * one omission here that is a safety decision rather than a data one.
 *
 * What is left is the thing a reader on a health query most needs and can least
 * easily check: whether a clinician reviewed the page, who, and how recently.
 * `MedicalWebPage` publishes exactly that, and the sites that bother to publish
 * it are the sites worth reading.
 */
export function readHealth(run: SearchRun): ResultModule | null {
	const pages = marked(run.sources, "MedicalWebPage");
	if (pages.length === 0) return null;

	const reviewed = pages.find(
		(entry) =>
			named(entry.node, "reviewedBy") ?? str(entry.node, "lastReviewed"),
	);
	// Without a review this is a list of domains, which the rail already is.
	if (!reviewed) return null;

	const last = date(str(reviewed.node, "lastReviewed"));

	return {
		kind: "health",
		reviewedBy: named(reviewed.node, "reviewedBy"),
		lastReviewed: last
			? last.toLocaleString(undefined, { month: "long", year: "numeric" })
			: undefined,
		domains: [
			...new Set(
				pages.map((entry) => entry.source.domain.replace(/^www\./, "")),
			),
		].slice(0, 4),
		provenance: "REVIEW STATUS AS EACH PAGE DECLARES IT · NOT A DIAGNOSIS",
	};
}
