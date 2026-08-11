"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Source } from "@/lib/search/types";
import { ArrowRightIcon, CloseIcon, ExternalIcon } from "./icons";

/**
 * The passage behind a citation.
 *
 * Two views, and the distinction is the whole reason a citation is worth
 * clicking: `cited` is the sentences the answer actually rests on, `page` is
 * everything extracted from that URL, with the cited ones still marked. A
 * citation that only linked out would make the reader re-find the claim on a
 * page we already read for them.
 */
export function EvidencePanel({
	source,
	position,
	total,
	onClose,
	onNext,
}: {
	source: Source;
	/** 1-based position of this source among the ones retrieved. */
	position: number;
	total: number;
	onClose: () => void;
	onNext: () => void;
}) {
	// The caller keys this component by source id, so opening a different
	// citation into an already-open panel remounts it and the view resets to
	// that source's own cited passages rather than inheriting the last one's.
	const [view, setView] = useState<"cited" | "page">("cited");
	const cited = source.passages.filter((passage) => passage.cited);
	const shown = view === "cited" ? cited : source.passages;

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-start justify-between gap-4 border-border-default border-b px-5 py-5 sm:px-6">
				<div className="flex min-w-0 gap-[11px]">
					<span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-accent font-mono text-2xs text-fg-on-accent">
						{source.n}
					</span>
					<div className="min-w-0">
						<h2 className="font-semibold text-base leading-snug">
							{source.title}
						</h2>
						<p className="mt-1.5 truncate font-mono text-2xs text-fg-tertiary">
							{source.path}
						</p>
					</div>
				</div>
				<button
					aria-label="Close evidence"
					className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-tertiary transition-colors duration-fast ease-out hover:bg-bg-sunken hover:text-fg-primary"
					onClick={onClose}
					type="button"
				>
					<CloseIcon />
				</button>
			</div>

			<div className="flex items-center gap-2 border-border-default border-b px-5 py-3 sm:px-6">
				<button
					aria-pressed={view === "cited"}
					className={cn(
						"rounded-pill px-2.5 py-1 font-mono text-2xs transition-colors duration-fast ease-out",
						view === "cited"
							? "bg-ink-0 text-paper-0"
							: "border border-border-default text-fg-secondary hover:text-fg-primary",
					)}
					onClick={() => setView("cited")}
					type="button"
				>
					CITED PASSAGES · {cited.length}
				</button>
				<button
					aria-pressed={view === "page"}
					className={cn(
						"rounded-pill px-2.5 py-1 font-mono text-2xs transition-colors duration-fast ease-out",
						view === "page"
							? "bg-ink-0 text-paper-0"
							: "border border-border-default text-fg-secondary hover:text-fg-primary",
					)}
					onClick={() => setView("page")}
					type="button"
				>
					FULL PAGE
				</button>
				<a
					className="ml-auto inline-flex items-center gap-1.5 text-fg-secondary text-sm transition-colors duration-fast ease-out hover:text-fg-primary"
					href={source.url}
					rel="noreferrer nofollow"
					target="_blank"
				>
					Open
					<ExternalIcon />
				</a>
			</div>

			<div className="scroll-region flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5 text-base leading-relaxed sm:px-6">
				{shown.map((passage) =>
					passage.cited ? (
						<p
							className="rounded-r-sm border-accent border-l-2 bg-accent-soft px-4 py-3.5 text-ink-1"
							key={passage.id}
						>
							{passage.text}
						</p>
					) : (
						<p className="text-fg-tertiary" key={passage.id}>
							{passage.text}
						</p>
					),
				)}
			</div>

			<div className="flex items-center gap-2.5 border-border-default border-t px-5 py-4 sm:px-6">
				<Button disabled={total < 2} onClick={onNext} variant="secondary">
					Next source
					<ArrowRightIcon />
				</Button>
				<span className="font-mono text-2xs text-fg-tertiary">
					{position} of {total}
				</span>
			</div>
		</div>
	);
}
