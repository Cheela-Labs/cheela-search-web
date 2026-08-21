import { marked, named, str } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * The papers, with who wrote them and when.
 *
 * ## The citation counts are missing, and that is the point
 *
 * The design's research artboard leads on `1,204 CITES`, and it is the most
 * persuasive thing on the card — a reader scans that column to decide what to
 * read first. Nothing in this system knows a citation count. There is no
 * bibliometric source wired to it, `ScholarlyArticle.citation` is a list of
 * works cited *by* this paper rather than a count of citations *to* it, and
 * inferring one from anything else here would be a number with no origin
 * attached to the one field a researcher would most trust.
 *
 * So the column is the year and the authors, which is what the markup actually
 * says. Two papers are the floor: one is a rail row.
 */
export function readResearch(run: SearchRun): ResultModule | null {
	const papers = marked(run.sources, "ScholarlyArticle")
		.map((entry) => {
			const title =
				str(entry.node, "headline") ??
				str(entry.node, "name") ??
				entry.source.title;
			if (!title) return null;
			const published =
				str(entry.node, "datePublished") ?? str(entry.node, "dateModified");
			return {
				id: entry.source.id,
				title,
				by: named(entry.node, "author"),
				year: published?.slice(0, 4),
				url: entry.source.url,
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		.slice(0, 5);

	if (papers.length < 2) return null;

	return {
		kind: "research",
		papers,
		provenance: "AUTHORS AND DATES FROM EACH PAPER'S OWN METADATA",
	};
}
