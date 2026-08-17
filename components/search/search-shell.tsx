"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { search as callSearch } from "@/lib/search/client";
import {
	emptyRun,
	runFromResponse,
	type SearchRun,
	type Source,
} from "@/lib/search/types";
import { useIsCompact } from "@/lib/use-is-compact";
import { AccountChip } from "./account-chip";
import { Block } from "./blocks";
import { Brand } from "./brand";
import { Composer } from "./composer";
import { EvidencePanel } from "./evidence-panel";
import { PlacesGrid } from "./places-grid";
import { SourcesList } from "./sources-rail";
import { SourcesSheet } from "./sources-sheet";

/**
 * One bar, two layouts, and the transition between them is the product.
 *
 * The bar starts centred with nothing else on the page; asking drops it to the
 * bottom and the answer builds upward from it in discrete bubbles while the
 * sources fill the rail beside it. Everything below is in service of that, and
 * the two rules worth not breaking are:
 *
 *   1. Sources and capabilities render above the answer. They used to *arrive*
 *      before it — the pipeline streamed, and they were ready about two seconds
 *      earlier — and the layout is unchanged now that one buffered response
 *      delivers everything at once. What was a latency property is now only an
 *      ordering one, which is worth knowing before someone reinstates a spinner
 *      per section to imply progress that no longer exists.
 *   2. Nothing on screen is a placeholder for a thing that does not work. A
 *      dead control in a search interface is indistinguishable from a broken
 *      one.
 */

function queryFromLocation(): string {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
}

export function SearchShell({ initialQuery }: { initialQuery: string }) {
	const [run, setRun] = useState<SearchRun | null>(null);
	/**
	 * The conversation, as far as this surface is concerned.
	 *
	 * A ref rather than state: it is read when a search starts and written when
	 * one finishes, and it must never itself cause a render. It deliberately
	 * does not survive a reload — a session is a train of thought, and resuming
	 * one from yesterday would silently rewrite an unrelated query against it.
	 */
	const sessionRef = useRef<string | null>(null);
	const [draft, setDraft] = useState("");
	const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [shared, setShared] = useState(false);
	const compact = useIsCompact();

	const abortRef = useRef<AbortController | null>(null);
	const threadRef = useRef<HTMLDivElement>(null);

	const search = useCallback(async (query: string) => {
		const trimmed = query.trim();
		if (!trimmed) return;

		// A follow-up typed over a running search cancels it. Without this, two
		// responses race and the slower one wins — so the answer left on screen
		// is the one for the query the reader already replaced.
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setRun(emptyRun(trimmed));
		setDraft("");
		setActiveSourceId(null);
		setSheetOpen(false);
		setShared(false);

		try {
			const response = await callSearch(
				trimmed,
				// The session id the API handed back last time. It is what makes
				// "how many died?" resolvable against the query before it.
				sessionRef.current,
				controller.signal,
			);
			sessionRef.current = response.sessionId;
			setRun((current) =>
				current && current.query === trimmed
					? runFromResponse(trimmed, response)
					: current,
			);
		} catch (error) {
			if (controller.signal.aborted) return;
			const message = error instanceof Error ? error.message : "Search failed";
			setRun((current) =>
				current && current.query === trimmed
					? { ...current, status: "error", error: message }
					: current,
			);
		}
	}, []);

	const submit = useCallback(
		(query: string) => {
			// Native history rather than the router: the result stream is client
			// state, and a router navigation would re-render the server component
			// and throw it away mid-search. Next supports pushState directly for
			// exactly this.
			window.history.pushState(null, "", `/?q=${encodeURIComponent(query)}`);
			void search(query);
		},
		[search],
	);

	// The URL is the query, so back and forward have to work — a search result
	// you cannot navigate back out of is a broken page, not a single-page app.
	useEffect(() => {
		const onPopState = () => {
			const query = queryFromLocation();
			if (!query) {
				abortRef.current?.abort();
				setRun(null);
				setActiveSourceId(null);
				setSheetOpen(false);
				return;
			}
			void search(query);
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [search]);

	useEffect(() => {
		if (initialQuery) void search(initialQuery);
		return () => abortRef.current?.abort();
	}, [initialQuery, search]);

	// How much has arrived. The thread is bottom-anchored and only scrolls once
	// the answer is taller than the column, so pinning it on each arrival keeps
	// the newest block in view rather than letting it land below the fold.
	//
	// With one buffered response this changes once per search rather than a dozen
	// times, so the effect below fires once — which is all it ever needed to do.
	const arrivals = (run?.blocks.length ?? 0) + (run?.sources.length ?? 0);

	useEffect(() => {
		const node = threadRef.current;
		if (!node || arrivals === 0) return;
		node.scrollTop = node.scrollHeight;
	}, [arrivals]);

	const sources = run?.sources ?? [];
	const activeSource: Source | null =
		sources.find((source) => source.id === activeSourceId) ?? null;

	const selectSource = useCallback((sourceId: string) => {
		setActiveSourceId(sourceId);
		setSheetOpen(true);
	}, []);

	const closeEvidence = useCallback(() => {
		setActiveSourceId(null);
		setSheetOpen(false);
	}, []);

	const nextSource = useCallback(() => {
		if (!sources.length) return;
		setActiveSourceId((current) => {
			const index = sources.findIndex((source) => source.id === current);
			return sources[(index + 1) % sources.length]?.id ?? current;
		});
	}, [sources]);

	const share = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setShared(true);
			window.setTimeout(() => setShared(false), 2000);
		} catch {
			// Clipboard access can be refused outright; the URL is in the address
			// bar either way, so there is nothing to recover from.
		}
	}, []);

	/* ----------------------------------------------------------------------
	   01 — Start. Nothing on the page but the bar.
	   -------------------------------------------------------------------- */
	if (!run) {
		return (
			<div className="flex h-dvh flex-col overflow-hidden bg-bg-page">
				<header className="flex shrink-0 justify-end px-6 py-5 sm:px-8">
					<AccountChip />
				</header>
				<main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-5 pb-16 sm:gap-9 sm:pb-20">
					<Brand variant="hero" />
					<div className="w-full max-w-[680px]">
						<Composer
							autoFocus
							onChange={setDraft}
							onSubmit={submit}
							placeholder="Ask anything…"
							value={draft}
							variant="hero"
						/>
					</div>
				</main>
			</div>
		);
	}

	const busy = run.status === "running";
	const blockContext = {
		sources,
		activeSourceId,
		onSelectSource: selectSource,
		onSubmitQuery: submit,
	};

	// The rail and the sheet show the same two things; only their padding
	// differs. Written once so a change to either view cannot land in one
	// presentation and not the other.
	const sourcesPane = (padding: string) =>
		activeSource ? (
			<EvidencePanel
				key={activeSource.id}
				onClose={closeEvidence}
				onNext={nextSource}
				position={
					sources.findIndex((source) => source.id === activeSource.id) + 1
				}
				source={activeSource}
				total={sources.length}
			/>
		) : (
			<div
				className={cn("scroll-region min-h-0 flex-1 overflow-y-auto", padding)}
			>
				<SourcesList
					activeSourceId={activeSourceId}
					onSelectSource={selectSource}
					run={run}
				/>
			</div>
		);

	/* ----------------------------------------------------------------------
	   02 / 03 / 04 — Working, answer, and evidence. One layout; the rail
	   widens when a citation is opened into it.
	   -------------------------------------------------------------------- */
	return (
		<div
			className={cn(
				"grid h-dvh grid-cols-1 overflow-hidden bg-bg-page",
				activeSource ? "lg:grid-cols-[1fr_520px]" : "lg:grid-cols-[1fr_360px]",
			)}
		>
			{/*
			  Capped at the design's 1080px column and centred. The composer is
			  centred within this column while the answer blocks hug its left edge,
			  which is the design's own relationship — but only at the width it was
			  drawn for. Left uncapped, a 1920px display pulls the two several
			  hundred pixels apart and the column stops reading as one thing.
			*/}
			<div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1080px] flex-col px-5 pt-5 pb-5 sm:px-10 sm:pb-9">
				<header className="flex shrink-0 items-center justify-between gap-4">
					<Brand variant="mark" />
					<div className="flex items-center gap-4 text-fg-secondary text-sm sm:gap-[18px]">
						<button
							className="transition-colors duration-fast ease-out hover:text-fg-primary"
							onClick={share}
							type="button"
						>
							{shared ? "Link copied" : "Share"}
						</button>
						<AccountChip />
					</div>
				</header>

				<div
					className="scroll-region thread-fade flex min-h-0 flex-1 flex-col overflow-y-auto"
					ref={threadRef}
				>
					<div className="flex flex-1 flex-col justify-end gap-4 py-6 sm:py-7">
						<p className="max-w-[560px] self-end text-right text-fg-secondary text-sm sm:text-base sm:leading-normal">
							{run.query}
						</p>

						{/*
						    Where the progress trace used to be.

						    It showed six named stages ticking over as their events
						    arrived, which was honest when the pipeline streamed. One
						    buffered response has no stages to report — it either has an
						    answer or it does not — and a fake trace animating against
						    nothing would be a progress bar that knows no progress.
						*/}
						{busy && run.blocks.length === 0 ? (
							<div className="w-full max-w-[720px] font-mono text-2xs text-fg-secondary tracking-wide">
								SEARCHING
							</div>
						) : null}

						{/* Above the answer, because it arrives before the answer does
						    and because a discovery query asked where to go, not for a
						    paragraph about it. */}
						{run.places.length > 0 ? <PlacesGrid places={run.places} /> : null}

						{run.blocks.map((block) => (
							<div className="block-in" key={block.id}>
								<Block block={block} context={blockContext} />
							</div>
						))}

						{run.status === "error" ? (
							<div className="w-full max-w-[720px] rounded-md border border-danger/40 bg-bg-surface px-5 py-4">
								<div className="font-mono text-2xs text-danger tracking-wide">
									SEARCH FAILED
								</div>
								<p className="mt-2 text-base text-ink-2 leading-relaxed">
									{run.error}
								</p>
							</div>
						) : null}

						{/* The rail has no room on a phone, so the sources move behind
						    a sheet — reachable from a row that says how many there are
						    rather than from an icon that does not. */}
						{sources.length ? (
							<button
								className="flex w-full max-w-[720px] items-center justify-between gap-3 rounded-md border border-border-default bg-bg-surface px-4 py-3 lg:hidden"
								onClick={() => {
									setActiveSourceId(null);
									setSheetOpen(true);
								}}
								type="button"
							>
								<span className="text-fg-secondary text-sm">
									{sources.length} source{sources.length === 1 ? "" : "s"}
								</span>
								<span className="font-medium text-sm">View</span>
							</button>
						) : null}
					</div>
				</div>

				<div className="w-full max-w-[680px] shrink-0 self-center">
					<Composer
						busy={busy}
						onChange={setDraft}
						onSubmit={submit}
						placeholder="Ask a follow-up…"
						value={draft}
						variant="docked"
					/>
				</div>
			</div>

			<aside className="hidden min-h-0 flex-col border-border-default border-l bg-bg-surface lg:flex">
				{sourcesPane("px-[22px] py-6")}
			</aside>

			{/*
			  Mounted only where it is the actual presentation. A modal <dialog>
			  that `lg:hidden` has made invisible is still `:modal`, and everything
			  outside it is still inert — so rendering this on a desktop viewport
			  made every click on the page do nothing the moment a citation opened.
			*/}
			{compact ? (
				<SourcesSheet onClose={closeEvidence} open={sheetOpen}>
					{sourcesPane("px-5 pt-2 pb-6")}
				</SourcesSheet>
			) : null}
		</div>
	);
}
