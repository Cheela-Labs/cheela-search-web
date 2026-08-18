"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { Source } from "@/lib/search/types";
import { CapabilityChips } from "./capability-chips";

/**
 * The site's own icon, over the domain swatch.
 *
 * The swatch is the fallback now rather than the icon. Roughly a fifth of
 * sites have no favicon we can get at — a single-page app answers
 * `/favicon.ico` with its own HTML, and some sites refuse anything that is not
 * a browser — so the coloured square has to stay for them, and it is already
 * what the rail drew before icons existed.
 *
 * It sits *under* the image rather than beside it so that a failure changes
 * nothing about the layout: same cell, same size, same position, whichever of
 * the two the reader ends up seeing. An icon that reserves no space until it
 * loads is a rail that reflows while it fills.
 *
 * `/api/favicon` is ours and same-origin. Pointing this at a third-party
 * favicon service would hand that service every result domain for every query
 * anybody runs here.
 *
 * A plain `<img>` rather than `next/image`, deliberately. The image is 16px
 * and already cached at the edge by the route that serves it, so an
 * optimisation pass would add a second proxy hop and a cache entry to save
 * nothing — and `next/image` has no way to express the one behaviour this
 * actually needs, which is falling back to the swatch when the fetch misses.
 */
function SiteIcon({ domain, swatch }: { domain: string; swatch: string }) {
	const [failed, setFailed] = useState(false);

	return (
		<span
			aria-hidden="true"
			className="mt-[3px] block h-4 w-4 shrink-0 overflow-hidden rounded-[4px]"
			style={{ background: swatch }}
		>
			{failed ? null : (
				// biome-ignore lint/performance/noImgElement: see the note above — next/image cannot express the onError fallback, and would re-proxy a 16px icon the edge already caches.
				<img
					alt=""
					className="h-full w-full object-contain"
					decoding="async"
					height={16}
					loading="lazy"
					onError={() => setFailed(true)}
					src={`/api/favicon?domain=${encodeURIComponent(domain)}`}
					width={16}
				/>
			)}
		</span>
	);
}

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
			<SiteIcon domain={source.domain} swatch={source.swatch} />
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
