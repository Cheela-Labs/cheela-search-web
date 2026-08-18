import { cn } from "@/lib/cn";
import type { Source } from "@/lib/search/types";
import { CapabilityChips } from "./capability-chips";

/**
 * One result in the rail: icon, link, title, description.
 *
 * The shape a reader already knows from every other search engine, which is
 * the argument for it — the rail is a list of results and reading it should
 * cost nothing. The citation number moved onto the link line to get there:
 * two markers in the icon column (a number badge *and* a colour swatch) is one
 * more than the row has room for, and the swatch is the one that reads as an
 * icon at a glance.
 *
 * Which card is open is carried by the border alone now. That is enough — the
 * evidence panel it opens is on screen beside it.
 */
export function SourceCard({
	source,
	active,
	onSelect,
}: {
	source: Source;
	active: boolean;
	onSelect: (sourceId: string) => void;
}) {
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
				aria-hidden="true"
				className="mt-[3px] h-4 w-4 shrink-0 rounded-[4px]"
				style={{ background: source.swatch }}
			/>
			<span className="min-w-0 flex-1">
				{/* Domain and path together, because a bare domain is the same three
				    words on every result from a documentation site and the path is
				    what tells them apart. Truncated from the end, where a long URL
				    keeps its query string rather than its subject. */}
				<span className="flex items-baseline gap-1.5">
					<span className="shrink-0 font-mono text-2xs text-fg-tertiary">
						{source.n}
					</span>
					<span className="truncate font-mono text-2xs text-fg-tertiary">
						{source.domain}
						{source.path}
					</span>
				</span>
				<span className="mt-[5px] block font-medium text-sm leading-normal">
					{source.title}
				</span>
				{/* No `block` here, deliberately: `line-clamp-2` works by setting
				    `display: -webkit-box`, and a `block` beside it overrides that and
				    silently un-clamps the description to its full length — which for
				    an extracted passage is several hundred words. */}
				{source.snippet ? (
					<span className="mt-1.5 line-clamp-2 text-fg-secondary text-xs leading-normal">
						{source.snippet}
					</span>
				) : null}
				{source.capabilities ? (
					<CapabilityChips capabilities={source.capabilities} />
				) : null}
			</span>
		</button>
	);
}

/**
 * Placeholder for a result still being fetched.
 *
 * Three bars rather than two, matching the three lines a real card now has —
 * a skeleton shorter than what replaces it makes the rail jump as it fills.
 */
export function SourceSkeleton({ dim }: { dim: number }) {
	return (
		<div
			className="skeleton flex gap-2.5 rounded-md border border-border-default bg-bg-page p-3"
			style={{ opacity: dim }}
		>
			<span className="mt-[3px] h-4 w-4 shrink-0 rounded-[4px] bg-bg-sunken" />
			<div className="flex flex-1 flex-col gap-[7px]">
				<span className="h-2 w-[55%] rounded-[4px] bg-bg-sunken" />
				<span className="h-2 w-[80%] rounded-[4px] bg-bg-sunken" />
				<span className="h-2 w-[70%] rounded-[4px] bg-bg-sunken" />
			</div>
		</div>
	);
}
