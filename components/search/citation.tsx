"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import type { Source } from "@/lib/search/types";

/**
 * A citation marker, and the evidence preview behind it.
 *
 * Hover previews, click opens the passage — so the marker is a real button,
 * and the preview answers on focus as well as on hover. There is no keyboard
 * path to "hover", and a citation you cannot inspect without a mouse is a
 * citation half the point of which is missing.
 *
 * The card is portalled to `document.body` and positioned fixed. It has to be:
 * the thread is a scroll container, and every answer block carries a finished
 * `translateY(0)` from its entry animation, which makes each one a containing
 * block for fixed descendants. Rendered in place, a preview above a citation
 * near the top of the thread would be clipped by both.
 */

const CARD_WIDTH = 300;
const VIEWPORT_MARGIN = 16;
const GAP = 10;

type CitationProps = {
	n: number;
	source: Source | undefined;
	/** The dark answer bubble needs the inverse of the light cards' treatment. */
	tone: "on-dark" | "on-light";
	/** The strongest evidence for this block's claim, rendered in accent. */
	primary?: boolean;
	/** This source is the one open in the evidence panel. */
	active?: boolean;
	onSelect: (sourceId: string) => void;
};

export function Citation({
	n,
	source,
	tone,
	primary = false,
	active = false,
	onSelect,
}: CitationProps) {
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [coords, setCoords] = useState<{ top: number; left: number } | null>(
		null,
	);

	const show = useCallback(() => {
		const rect = anchorRef.current?.getBoundingClientRect();
		if (!rect) return;
		const half = CARD_WIDTH / 2;
		const centred = rect.left + rect.width / 2 - half;
		const maxLeft = window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN;
		setCoords({
			top: rect.top,
			left: Math.min(
				Math.max(centred, VIEWPORT_MARGIN),
				Math.max(maxLeft, VIEWPORT_MARGIN),
			),
		});
	}, []);

	const hide = useCallback(() => setCoords(null), []);

	// A card pinned to viewport coordinates goes stale the moment anything
	// moves, and the thread scrolls under it while an answer streams in.
	useEffect(() => {
		if (!coords) return;
		window.addEventListener("scroll", hide, true);
		window.addEventListener("resize", hide);
		return () => {
			window.removeEventListener("scroll", hide, true);
			window.removeEventListener("resize", hide);
		};
	}, [coords, hide]);

	const dark = tone === "on-dark";
	const preview = source?.passages.find((passage) => passage.cited);

	return (
		<>
			<button
				aria-label={
					source
						? `Source ${n}: ${source.title} on ${source.domain}`
						: `Source ${n}`
				}
				className={cn(
					"ml-1 inline-flex translate-y-[-3px] items-center justify-center rounded-[4px] px-[5px] py-px align-baseline font-mono text-2xs transition-[background-color,color] duration-fast ease-out",
					dark
						? primary
							? "bg-accent text-fg-on-accent"
							: "bg-ink-3 text-paper-0 hover:bg-ink-4"
						: "border border-border-default bg-bg-sunken text-fg-secondary hover:border-border-strong hover:text-fg-primary",
					active && "outline-2 outline-accent outline-offset-2",
				)}
				onBlur={hide}
				onClick={() => source && onSelect(source.id)}
				onFocus={show}
				onMouseEnter={show}
				onMouseLeave={hide}
				ref={anchorRef}
				type="button"
			>
				{n}
			</button>

			{coords && source
				? createPortal(
						<div
							className="fade-in pointer-events-none fixed z-50 rounded-md border border-border-strong bg-bg-surface px-4 py-3.5 text-ink-2 shadow-lg"
							style={{
								left: coords.left,
								top: coords.top,
								width: CARD_WIDTH,
								transform: `translateY(calc(-100% - ${GAP}px))`,
							}}
						>
							<div className="flex items-center gap-[7px]">
								<span
									className="h-3 w-3 shrink-0 rounded-[3px]"
									style={{ background: source.swatch }}
								/>
								<span className="truncate font-mono text-2xs text-fg-tertiary">
									{source.domain}
								</span>
							</div>
							{preview ? (
								<p className="mt-2.5 text-sm leading-normal">
									&ldquo;{preview.text}&rdquo;
								</p>
							) : null}
							<div className="mt-2.5 font-mono text-2xs text-fg-tertiary">
								CLICK TO OPEN · {source.passages.filter((p) => p.cited).length}{" "}
								PASSAGES
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
