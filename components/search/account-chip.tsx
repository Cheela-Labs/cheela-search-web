"use client";

import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { site } from "@/lib/site";

type Me =
	| { signedIn: false }
	| { signedIn: true; email: string | null; initials: string };

/**
 * The apps this account can reach from search.
 *
 * One entry, and the design's own data carries a `meta` of "YOUR SITES" that
 * its tile markup never renders — so neither does this. The list is here rather
 * than inline because the second app is the reason the tray exists at all; the
 * stagger below already reads `apps.length`.
 */
const APPS = [
	{ name: "Cheela Console", href: site.console, swatch: "bg-accent" },
] as const;

/**
 * The account entry point, and the app launcher it opens.
 *
 * Placement comes from the design and is not the same in both states. On the
 * start screen it is a 38px pill in the **bottom-left corner** — the far corner
 * from the composer, the one place on an otherwise empty page that can hold an
 * affordance without competing with the bar. Once a search has run the page has
 * a header, and it sits there at 28px like any other header control.
 *
 * Clicking it springs a tray of app tiles out of it, and the tray grows *from*
 * the button: `transform-origin` is the corner the button occupies, so the
 * motion reads as the tray coming out of the thing that was clicked rather than
 * appearing beside it. That is why `anchor` drives both the position and the
 * origin — they are the same fact stated twice.
 *
 * **Signed out is the first paint, always.** The chip renders its outline
 * immediately and fills in when `/api/me` answers. Rendering initials
 * optimistically — or blocking the header on a fetch — would either assert a
 * user we have not verified or delay the search box behind an answer nobody is
 * waiting for. A chip that fills in a moment later is the honest version.
 *
 * Signed out there is nothing to launch, so the control is a link to `/sign-in`
 * rather than a button that opens an empty tray.
 */
export function AccountChip({
	anchor = "header",
}: {
	/**
	 * `start` is the start screen's own placement, which is not one position:
	 * `01 Start` puts a 38px pill in the bottom-left corner, `05a Mobile start`
	 * puts a 28px chip at the top-right. One element, two corners, so the tray
	 * opens upward from the left on a desktop and downward from the right on a
	 * phone. `header` is the 28px chip a results page carries in its header.
	 */
	anchor?: "start" | "header";
}) {
	const [me, setMe] = useState<Me>({ signedIn: false });
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const trayId = useId();

	useEffect(() => {
		let cancelled = false;

		void fetch("/api/me", { credentials: "same-origin" })
			.then((response) => (response.ok ? response.json() : { signedIn: false }))
			.then((body: Me) => {
				if (!cancelled) setMe(body);
			})
			// A failed check means we cannot name this visitor, which is the same
			// state as signed out. There is nothing to report and nothing to retry.
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, []);

	// A tray that only closes by clicking the button again is a tray people
	// leave open. Escape and an outside click are the two ways every other
	// popover on the web closes, and both are expected here.
	useEffect(() => {
		if (!open) return;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setOpen(false);
		}
		function onPointerDown(event: PointerEvent) {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		}

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown);
		};
	}, [open]);

	const signedIn = me.signedIn && me.initials.length > 0;
	const label =
		me.signedIn && me.email
			? `Signed in as ${me.email}`
			: "Your Cheela account";
	const corner = anchor === "start";

	const face = signedIn ? (
		<span
			aria-hidden="true"
			className="font-medium font-mono leading-none tracking-wide"
		>
			{me.initials}
		</span>
	) : (
		<svg
			aria-hidden="true"
			fill="none"
			height="14"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="1.5"
			viewBox="0 0 14 14"
			width="14"
		>
			<circle cx="7" cy="5" r="2.4" />
			<path d="M2.6 12a4.6 4.6 0 0 1 8.8 0" />
		</svg>
	);

	/**
	 * Where the control sits, separately from how its tray stacks.
	 *
	 * Both branches below need the position and only the signed-in one needs the
	 * column, and keeping them together is how the signed-out link first shipped
	 * pinned to the top-left corner of the page.
	 */
	const placement = corner
		? "absolute top-5 right-5 z-10 sm:top-auto sm:right-auto sm:bottom-7 sm:left-8"
		: "relative";

	const faceClass = cn(
		"flex items-center justify-center rounded-pill bg-ink-0 text-paper-0",
		"transition-transform duration-base ease-spring motion-reduce:transition-none",
		corner
			? "h-[26px] w-[26px] text-[10px] sm:h-[38px] sm:w-[38px] sm:border sm:border-border-strong sm:shadow-md"
			: "h-[26px] w-[26px] text-[10px]",
		open && "scale-[0.92]",
		!open && "hover:opacity-80",
	);

	// Nothing to launch, so this is a link — and it carries where to come back
	// to, because signing in from a search should return to that search.
	if (!signedIn) {
		return (
			<a
				aria-label={label}
				className={cn(placement, faceClass)}
				href="/sign-in"
				title={label}
			>
				{face}
			</a>
		);
	}

	return (
		<div
			className={cn(
				"flex gap-2.5",
				placement,
				corner
					? // Top-right on a phone, bottom-left on a desktop — and the tray
						// sits on the far side of the button in each, which is what the
						// reversed column direction buys.
						"flex-col-reverse items-end sm:flex-col sm:items-start"
					: "flex-col items-end gap-2",
			)}
			ref={rootRef}
		>
			{/*
			  Rendered in both states rather than mounted on open: a tray that
			  mounts on click has no closed position to animate out of, so the
			  spring only ever plays in one direction. `pointer-events-none` and
			  `aria-hidden` keep the closed copy out of the way of both the mouse
			  and the screen reader.
			*/}
			<div
				aria-hidden={!open}
				className={cn(
					"flex flex-col gap-2",
					"transition-[transform,opacity] duration-slow ease-spring motion-reduce:transition-none",
					corner
						? "origin-top-right items-end sm:origin-bottom-left sm:items-start"
						: "absolute top-[calc(100%+8px)] right-0 origin-top-right items-end",
					open
						? "scale-100 opacity-100"
						: "pointer-events-none scale-[0.82] opacity-0",
					!open &&
						(corner
							? "-translate-y-3.5 sm:translate-y-3.5"
							: "-translate-y-3.5"),
				)}
				id={trayId}
			>
				{APPS.map((app, index) => (
					<a
						className={cn(
							"flex items-center gap-[11px] rounded-md border border-border-strong bg-bg-surface py-[9px] pr-[13px] pl-[11px] shadow-md",
							"transition-transform duration-slow ease-spring motion-reduce:transition-none",
							!open && "scale-90",
							// Away from the button, whichever side it is on.
							!open &&
								(corner
									? "-translate-y-(--tile-lift) sm:translate-y-(--tile-lift)"
									: "-translate-y-(--tile-lift)"),
						)}
						href={app.href}
						key={app.name}
						rel="noreferrer"
						style={
							{
								// The tiles land in sequence rather than together, and
								// the offset is per-tile — so it cannot be a class. A
								// custom property rather than an inline `transform`,
								// because the direction it lifts from *is* a class and
								// an inline transform would win over it.
								"--tile-lift": `${(APPS.length - index) * 8}px`,
							} as CSSProperties
						}
						tabIndex={open ? undefined : -1}
					>
						<span
							aria-hidden="true"
							className={cn(
								"h-[26px] w-[26px] flex-none rounded-[7px]",
								app.swatch,
							)}
						/>
						<span className="whitespace-nowrap font-medium text-sm">
							{app.name}
						</span>
					</a>
				))}
			</div>

			<button
				aria-controls={trayId}
				aria-expanded={open}
				aria-label={label}
				className={cn(faceClass, "cursor-pointer")}
				onClick={() => setOpen((value) => !value)}
				title={label}
				type="button"
			>
				{face}
			</button>
		</div>
	);
}
