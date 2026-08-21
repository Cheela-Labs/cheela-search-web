import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The design's whole vocabulary, in eight pieces.
 *
 * `Cheela Search Intents.dc.html` is 629 lines of markup and **874 characters
 * of bespoke CSS**. Everything else in it is inline styles over the custom
 * properties `globals.css` already defines byte-for-byte. Twenty artboards, and
 * between them they use one card, one eyebrow, one pill, one fact grid, one row
 * list, one chip, one code slab and one footer strip.
 *
 * Building them once is what keeps fifteen result modules to about fifty lines
 * each, and it is what stops the twentieth card inventing a slightly different
 * border.
 *
 * `Provenance` is the one that is not decoration. Every artboard in the design
 * ends with a line saying where its data came from — `PRICES CHECKED 6 MIN AGO ·
 * NO AFFILIATE RANKING`, `COMPUTED LOCALLY · NO SOURCES NEEDED`, `MARKET DATA,
 * NOT ADVICE`. That is the design's honesty mechanism and it is ours: a module
 * here renders a publisher's claim about their own page, and the footer is
 * where it says whose claim it is.
 */

/** The design's module width, matching `blocks.tsx`'s own `CARD`. */
export const MODULE = "w-full max-w-[720px]";

export function ModuleCard({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				MODULE,
				"overflow-hidden rounded-md border border-border-default bg-bg-surface",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** The house eyebrow: mono, 11px, letter-spaced, quiet. */
export function Eyebrow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"font-mono text-2xs text-fg-tertiary tracking-wide",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** A padded band. `divide` draws the design's 1px rule above it. */
export function Band({
	children,
	className,
	divide,
}: {
	children: ReactNode;
	className?: string;
	divide?: boolean;
}) {
	return (
		<div
			className={cn(
				"px-4 py-3.5 sm:px-5",
				divide && "border-border-default border-t",
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * The pill row. The first is the active one, as every artboard draws it.
 *
 * Deliberately not buttons: these are labels for what is being shown, and a
 * pill that looks pressable and does nothing is the dead control
 * `search-shell.tsx` names in its own second rule.
 */
export function Pills({ items }: { items: string[] }) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{items.map((item, index) => (
				<span
					className={cn(
						"rounded-pill px-2.5 py-1 font-mono text-2xs",
						index === 0
							? "bg-ink-0 text-paper-0"
							: "border border-border-default text-fg-secondary",
					)}
					key={item}
				>
					{item}
				</span>
			))}
		</div>
	);
}

/** An accent pill, for the one value on a card that is live or favourable. */
export function AccentChip({ children }: { children: ReactNode }) {
	return (
		<span className="rounded-pill bg-accent-soft px-2.5 py-1 font-mono text-2xs text-accent-strong">
			{children}
		</span>
	);
}

/** The label/value grid: values in mono, a rule between each pair. */
export function FactTable({
	facts,
}: {
	facts: { label: string; value: string }[];
}) {
	if (facts.length === 0) return null;
	return (
		<dl className="grid grid-cols-[minmax(88px,auto)_1fr] text-sm">
			{facts.map((fact, index) => (
				<div className="contents" key={fact.label}>
					<dt
						className={cn(
							"py-2.5 pr-4 text-fg-secondary",
							index > 0 && "border-border-default border-t",
						)}
					>
						{fact.label}
					</dt>
					<dd
						className={cn(
							"py-2.5 font-mono",
							index > 0 && "border-border-default border-t",
						)}
					>
						{fact.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** A list of divided rows — the shape most of these modules are. */
export function Rows({ children }: { children: ReactNode }) {
	return <div className="flex flex-col">{children}</div>;
}

export function Row({
	children,
	href,
	className,
}: {
	children: ReactNode;
	href?: string;
	className?: string;
}) {
	const shared = cn(
		"border-border-default border-t px-4 py-3 text-sm sm:px-5",
		className,
	);
	if (!href) return <div className={shared}>{children}</div>;
	return (
		<a
			className={cn(
				shared,
				"block transition-colors duration-fast ease-out hover:bg-bg-sunken",
			)}
			href={href}
			rel="noopener noreferrer nofollow"
			target="_blank"
		>
			{children}
		</a>
	);
}

/**
 * The dark slab, for text that is code or a command.
 *
 * Used only where a publisher marked the span as code. `blocks.tsx` uses the
 * same `bg-ink-1` for the answer bubble, which is the design's one dark surface.
 */
export function CodeSlab({ children }: { children: ReactNode }) {
	return (
		<pre className="scroll-region overflow-x-auto bg-ink-1 px-4 py-4 font-mono text-paper-0 text-sm leading-relaxed sm:px-5">
			<code>{children}</code>
		</pre>
	);
}

/** Where this card's data came from. Every module ends with one. */
export function Provenance({ children }: { children: ReactNode }) {
	return (
		<Eyebrow className="border-border-default border-t px-4 py-3 sm:px-5">
			{children}
		</Eyebrow>
	);
}

/**
 * A third-party image with the two guards every one of them needs here.
 *
 * The referrer policy is the same one `places-grid.tsx` sets and for the same
 * reason: the query is in this page's URL, and without it every host whose
 * image loads is told what was searched to reach them. The failure fallback is
 * the other half — hotlink protection and moved CDNs are routine, and a broken
 * image icon is worse than an empty box that reserved its space.
 */
export function RemoteImage({
	src,
	className,
	fit = "cover",
}: {
	src: string | undefined;
	className?: string;
	fit?: "cover" | "contain";
}) {
	if (!src) return null;
	return (
		// biome-ignore lint/performance/noImgElement: next/image needs every host allow-listed ahead of time, and these are whichever hosts the query happened to retrieve.
		<img
			alt=""
			className={cn(
				"h-full w-full",
				fit === "cover" ? "object-cover" : "object-contain",
				className,
			)}
			decoding="async"
			loading="lazy"
			referrerPolicy="no-referrer"
			src={src}
		/>
	);
}
