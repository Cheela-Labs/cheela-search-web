import { firstMarked, str, strs } from "../structured";
import type { SearchRun } from "../types";
import type { Fact, ResultModule } from "./index";

/**
 * The canonical page, and its own outline.
 *
 * ## What this module is not
 *
 * The design's documentation artboard is built around a signature in a code
 * slab — `SETEX key seconds value`. It cannot be drawn from what the index
 * holds. `crawler/extract.ts` produces plain text and preserves no `<pre>`, so
 * a page's code blocks are indistinguishable from its prose by the time they
 * reach here. Rendering a paragraph in a mono slab and calling it a signature
 * would be a formatting lie.
 *
 * What the index does hold, on nearly every documentation page, is the heading
 * outline and the breadcrumb trail — the author's own statement of where this
 * page sits and what is on it. That, the canonical link, and the passages the
 * ranker chose is a genuinely useful documentation card, and it is all true.
 *
 * Unlocking the code slab is a crawler change: a `code_blocks` field, a Vespa
 * schema change and a reindex. It is worth doing and it is not this.
 */
export function readDocs(run: SearchRun): ResultModule | null {
	// The top result, not a searched-for one: a documentation query that ranked
	// a page first has already answered "which page", and picking a different
	// one here would disagree with the rail directly under it.
	const source = run.sources[0];
	if (!source) return null;

	const sections = (source.headings ?? []).filter(Boolean).slice(0, 6);
	const body = source.description || source.passages[0]?.text || source.snippet;

	// An outline is the primary element. Without one this is a rail row with a
	// border drawn round it.
	if (sections.length < 2 || !body) return null;

	const marked = firstMarked(
		run.sources,
		"TechArticle",
		"APIReference",
		"HowTo",
	);
	const facts: Fact[] = [];
	const level = str(marked?.node, "proficiencyLevel");
	if (level) facts.push({ label: "Level", value: level });
	const language = str(marked?.node, "programmingLanguage");
	if (language) facts.push({ label: "Language", value: language });
	const modified = str(marked?.node, "dateModified");
	if (modified) facts.push({ label: "Updated", value: modified.slice(0, 10) });

	return {
		kind: "docs",
		title: source.title,
		trail: strs(marked?.node, "articleSection").slice(0, 3),
		sections,
		body,
		facts,
		url: source.url,
		provenance: `FROM ${source.domain.toUpperCase()} · THE PAGE'S OWN OUTLINE`,
	};
}
