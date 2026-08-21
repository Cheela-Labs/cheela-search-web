import {
	clock,
	date,
	duration,
	firstMarked,
	href,
	named,
	nodes,
	num,
	str,
} from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * The video, and where in it the answer is.
 *
 * `VideoObject` is well published — a platform that wants its videos to appear
 * anywhere writes it — and `hasPart`/`Clip` carries the chapters, which is the
 * part of the design's artboard that actually earns the module. A list of
 * timestamps that jump into the video is a better answer to "redis crash
 * course" than a link to ninety minutes of it.
 *
 * A name plus either a still or a duration is the floor. A `VideoObject` with
 * neither is a link with an `@type` on it.
 */
export function readVideo(run: SearchRun): ResultModule | null {
	const marked = firstMarked(run.sources, "VideoObject");
	if (!marked) return null;

	const title = str(marked.node, "name") ?? marked.source.title;
	const thumbnail =
		href(str(marked.node, "thumbnailUrl")) ?? marked.source.image;
	const seconds = duration(str(marked.node, "duration"));
	if (!title || (!thumbnail && !seconds)) return null;

	const uploaded = date(str(marked.node, "uploadDate"));

	const chapters = nodes(marked.node, "hasPart")
		.map((clip) => {
			const label = str(clip, "name");
			const at = num(clip, "startOffset");
			return label && at !== undefined && at >= 0
				? { at: clock(at), label }
				: null;
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		.slice(0, 6);

	return {
		kind: "video",
		title,
		thumbnail,
		by: named(marked.node, "author") ?? named(marked.node, "publisher"),
		length: seconds ? clock(seconds) : undefined,
		uploaded: uploaded
			? uploaded
					.toLocaleString(undefined, { month: "short", year: "numeric" })
					.toUpperCase()
			: undefined,
		chapters,
		url: marked.source.url,
		provenance: chapters.length
			? `CHAPTERS AS ${marked.source.domain.toUpperCase()} PUBLISHED THEM`
			: `FROM ${marked.source.domain.toUpperCase()}`,
	};
}
