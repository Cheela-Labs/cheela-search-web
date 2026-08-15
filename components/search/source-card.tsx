import { cn } from "@/lib/cn";
import type { Source } from "@/lib/search/types";
import { CapabilityChips } from "./capability-chips";

export function SourceCard({
	source,
	active,
	onSelect,
}: {
	source: Source;
	active: boolean;
	onSelect: (sourceId: string) => void;
}) {
	const cited = source.passages.filter((passage) => passage.cited).length;

	return (
		<button
			className={cn(
				"fade-in flex w-full gap-[11px] rounded-md border bg-bg-page px-3.5 py-3 text-left transition-colors duration-fast ease-out",
				active
					? "border-accent"
					: "border-border-default hover:border-border-strong",
			)}
			onClick={() => onSelect(source.id)}
			type="button"
		>
			<span
				className={cn(
					"flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] font-mono text-2xs",
					active
						? "bg-accent text-fg-on-accent"
						: "border border-border-default bg-bg-sunken text-fg-secondary",
				)}
			>
				{source.n}
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span
						className="h-3 w-3 shrink-0 rounded-[3px]"
						style={{ background: source.swatch }}
					/>
					<span className="truncate font-mono text-2xs text-fg-tertiary">
						{source.domain}
					</span>
				</span>
				<span className="mt-[5px] block font-medium text-sm leading-normal">
					{source.title}
				</span>
				<span className="mt-1.5 block font-mono text-2xs text-fg-secondary">
					{cited} passage{cited === 1 ? "" : "s"}
					{source.capturedLabel ? ` · ${source.capturedLabel}` : ""}
				</span>
				{source.capabilities ? (
					<CapabilityChips capabilities={source.capabilities} />
				) : null}
			</span>
		</button>
	);
}

/**
 * Placeholder for a source still being fetched.
 *
 * The rail fills as extraction completes, so the count of these is the count
 * of candidate URLs still outstanding — an empty rail during the slowest stage
 * of the pipeline reads as a stalled one.
 */
export function SourceSkeleton({ dim }: { dim: number }) {
	return (
		<div
			className="skeleton flex h-[62px] gap-2.5 rounded-md border border-border-default bg-bg-page p-3"
			style={{ opacity: dim }}
		>
			<span className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-bg-sunken" />
			<div className="flex flex-1 flex-col gap-[7px]">
				<span className="h-2 w-[70%] rounded-[4px] bg-bg-sunken" />
				<span className="h-2 w-[45%] rounded-[4px] bg-bg-sunken" />
			</div>
		</div>
	);
}
