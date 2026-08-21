import { firstMarked, str } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * A code sample, when the page published one as code.
 *
 * ## Why this abstains most of the time, and why that is right
 *
 * The design's coding artboard is a syntax-highlighted sliding-window rate
 * limiter with a `GOTCHA` note under it. Neither can be drawn from the index.
 * `crawler/extract.ts` produces plain text and preserves no `<pre>`, so by the
 * time a page reaches here its code and its prose are the same string. Picking
 * a passage that looks code-shaped and rendering it in a mono slab would be a
 * guess presented as a quotation — and a mis-transcribed six-line snippet is
 * the kind of wrong someone pastes into a service.
 *
 * `SoftwareSourceCode.text` is the one case where a publisher has said "this
 * span is code", so it is the only case this renders. That is rare, and the
 * card being absent on most coding queries is the honest outcome: the rail
 * links to the page, which has the code correctly formatted on it.
 *
 * The real fix is a crawler that keeps code blocks — a `code_blocks` field, a
 * schema change and a reindex. Then this module has something to read on every
 * documentation page on the web.
 */
export function readCoding(run: SearchRun): ResultModule | null {
	const marked = firstMarked(run.sources, "SoftwareSourceCode");
	if (!marked) return null;

	const code = str(marked.node, "text");
	// A sample with no source text is a link. It is also the common case: most
	// `SoftwareSourceCode` nodes carry only a repository URL.
	if (!code || code.trim().length < 20) return null;

	return {
		kind: "coding",
		title: str(marked.node, "name"),
		language:
			str(marked.node, "programmingLanguage")?.toUpperCase() ??
			str(marked.node, "codeSampleType")?.toUpperCase(),
		code: code.trim(),
		url: marked.source.url,
		provenance: `PUBLISHED AS CODE BY ${marked.source.domain.toUpperCase()}`,
	};
}
