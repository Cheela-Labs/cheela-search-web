import type { SearchRun } from "@/lib/search/types";
import { SourceCard, SourceSkeleton } from "./source-card";

/**
 * The results column.
 *
 * Was the *evidence* column, when a card opened the passage the answer had
 * quoted. Every card is now a link that opens where it points, so there is no
 * selection to track and no panel to swap in — which is why nothing here takes
 * an active id any more.
 */
export function SourcesList({ run }: { run: SearchRun }) {
	const collecting = run.status === "running";
	// The skeletons the design fades out are the candidate URLs still being
	// fetched. Three of them, because the rail is a progress signal here, not
	// an accurate queue depth — the pipeline does not report which URL is next.
	const skeletons = collecting ? [1, 0.7, 0.4] : [];

	return (
		<div className="flex flex-col gap-3.5">
			{/* No count under the heading. It reported two numbers a reader has no
			    use for — how many results are in a list they can see, and how many
			    pages were crawled, which is a fact about the pipeline rather than
			    about the answer. The rail's own state says the rest: skeletons
			    while it collects, a sentence when it found nothing. */}
			<h2 className="font-semibold text-base">Results</h2>

			<div className="flex flex-col gap-2">
				{run.sources.map((source) => (
					<SourceCard key={source.id} source={source} />
				))}
				{skeletons.map((dim) => (
					<SourceSkeleton dim={dim} key={dim} />
				))}
				{!collecting && run.sources.length === 0 ? (
					<p className="text-fg-tertiary text-sm leading-normal">
						Nothing was retrieved for this query.
					</p>
				) : null}
			</div>
		</div>
	);
}
