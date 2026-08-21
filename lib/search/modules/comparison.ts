import type { SearchResponse, SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * The side-by-side table — the one module composed rather than extracted.
 *
 * `ComparisonCard` has been in `blocks.tsx` since the surface was built,
 * complete with a real `<table>`, a horizontal scroll region and mono numerals,
 * and nothing has ever produced one: no field on the response mapped to it.
 * `services/generator` now emits `COMPARE:`/`ROW:` lines on a comparison query
 * and drops the table outright when its shape does not hold, so what arrives
 * here is either a complete grid or nothing.
 *
 * Every cell is the model's reading of the sources it was fenced, not a value
 * lifted from any one page. A comparison is the shape of answer where a
 * confidently wrong cell costs the most — someone picks a database on it — so
 * the card is labelled as composed and the highlight is only ever drawn where
 * the model marked one. No highlight is a real answer: it says the sources did
 * not take a side.
 */
export function readComparison(
	_run: SearchRun,
	response: SearchResponse,
): ResultModule | null {
	const comparison = response.comparison;
	if (!comparison || comparison.subjects.length < 2) return null;
	if (comparison.rows.length === 0) return null;

	return {
		kind: "comparison",
		subjects: comparison.subjects,
		rows: comparison.rows,
	};
}
