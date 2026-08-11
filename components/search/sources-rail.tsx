import type { SearchRun } from "@/lib/search/types";
import { SourceCard, SourceSkeleton } from "./source-card";

/**
 * The evidence column.
 *
 * Sources appear here while the answer is still being composed, because the
 * pipeline genuinely has them first — extraction finishes roughly two seconds
 * before composition does. Holding them back until the answer arrived would
 * make the surface feel slower than the engine is.
 */
export function SourcesList({
	run,
	activeSourceId,
	onSelectSource,
}: {
	run: SearchRun;
	activeSourceId: string | null;
	onSelectSource: (sourceId: string) => void;
}) {
	const collecting = run.status === "running";
	// The skeletons the design fades out are the candidate URLs still being
	// fetched. Three of them, because the rail is a progress signal here, not
	// an accurate queue depth — the pipeline does not report which URL is next.
	const skeletons = collecting ? [1, 0.7, 0.4] : [];

	return (
		<div className="flex flex-col gap-3.5">
			<div>
				<h2 className="font-semibold text-base">Sources</h2>
				<p className="mt-1 font-mono text-2xs text-fg-tertiary">
					{collecting
						? `COLLECTING · ${run.crawled} CRAWLED`
						: `${run.sources.length} SOURCE${run.sources.length === 1 ? "" : "S"} · ${run.crawled} CRAWLED`}
				</p>
			</div>

			<div className="flex flex-col gap-2">
				{run.sources.map((source) => (
					<SourceCard
						active={source.id === activeSourceId}
						key={source.id}
						onSelect={onSelectSource}
						source={source}
					/>
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
