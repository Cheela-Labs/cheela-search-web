import type { Source, StructuredNode, StructuredValue } from "./types";

/**
 * Reading what a page said about itself.
 *
 * `apps/search-api` has already parsed the JSON-LD, dropped every type nothing
 * here reads, capped it, and validated every URL-shaped value to `http(s)`.
 * What arrives is small and typed. What is left is the awkward part, and it is
 * awkward for a reason worth stating once rather than in fifteen modules:
 *
 * **schema.org has no required shape.** Every property is optionally a string,
 * optionally an array of them, optionally a nested node, optionally an array of
 * nested nodes. `Event.location` is a `Place` on one site and the string
 * `"Moscone West"` on the next, and both are correct. Every reader below takes
 * the shape it wants and returns `undefined` for everything else, so a module
 * asks "did this page tell me a start date" and gets an answer, not a type
 * puzzle.
 *
 * Nothing here decides whether any of it is *true*. A page can claim any price
 * it likes. The modules render these attributed to the domain they came from,
 * which is the only frame a publisher's self-description can honestly be shown
 * in.
 */

export type Marked = { source: Source; node: StructuredNode };

const isNodeArray = (value: StructuredValue): value is StructuredNode[] =>
	Array.isArray(value) && typeof value[0] === "object" && value[0] !== null;

/** A property as a single string. The first, when the page gave several. */
export function str(
	node: StructuredNode | undefined,
	prop: string,
): string | undefined {
	const value = node?.props[prop];
	if (typeof value === "string") return value || undefined;
	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0] || undefined;
	}
	return undefined;
}

/** A property as a list of strings. Empty when it was nodes, or absent. */
export function strs(node: StructuredNode | undefined, prop: string): string[] {
	const value = node?.props[prop];
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => typeof entry === "string");
	}
	return [];
}

/** A property as nested nodes. Empty when it was a plain string, or absent. */
export function nodes(
	node: StructuredNode | undefined,
	prop: string,
): StructuredNode[] {
	const value = node?.props[prop];
	return value && isNodeArray(value) ? value : [];
}

/** The first nested node under a property. */
export const node = (
	parent: StructuredNode | undefined,
	prop: string,
): StructuredNode | undefined => nodes(parent, prop)[0];

/**
 * A property that is *either* a nested node's `name` or a bare string.
 *
 * The single most common shape problem in schema.org and the reason this
 * helper exists: `location`, `seller`, `publisher`, `author`, `brand` and
 * `performer` are all routinely published both ways.
 */
export function named(
	parent: StructuredNode | undefined,
	prop: string,
): string | undefined {
	const nested = node(parent, prop);
	if (nested) return str(nested, "name") ?? str(nested, "headline");
	return str(parent, prop);
}

/** A property as a finite number. Prices arrive as strings and must parse. */
export function num(
	node: StructuredNode | undefined,
	prop: string,
): number | undefined {
	const raw = str(node, prop);
	if (raw === undefined) return undefined;
	const parsed = Number(raw.replace(/[^\d.-]/g, ""));
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** Every node of a given type, paired with the source that published it. */
export function marked(sources: Source[], ...types: string[]): Marked[] {
	const wanted = new Set(types);
	const out: Marked[] = [];
	for (const source of sources) {
		for (const entry of source.structured ?? []) {
			if (wanted.has(entry.type)) out.push({ source, node: entry });
		}
	}
	return out;
}

/** The first node of a given type across the results, in ranked order. */
export const firstMarked = (
	sources: Source[],
	...types: string[]
): Marked | undefined => marked(sources, ...types)[0];

/* -------------------------------------------------------------------------- */
/* Values                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A date a publisher wrote, as a `Date`.
 *
 * Rejects anything `Date` would silently accept and get wrong, and anything
 * implausible: a `startDate` of `0001-01-01` is a templating bug, and rendering
 * it as a date is how a card ends up announcing an event in the year 1.
 */
export function date(value: string | undefined): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	const year = parsed.getUTCFullYear();
	return year >= 1900 && year <= 2200 ? parsed : null;
}

/** An ISO-8601 duration (`PT1H42M8S`) in seconds. */
export function duration(value: string | undefined): number | null {
	if (!value) return null;
	const match =
		/^P(?:([\d.]+)D)?T(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/.exec(
			value.trim().toUpperCase(),
		);
	if (!match) return null;
	const [, days, hours, minutes, seconds] = match;
	const total =
		Number(days ?? 0) * 86400 +
		Number(hours ?? 0) * 3600 +
		Number(minutes ?? 0) * 60 +
		Number(seconds ?? 0);
	return Number.isFinite(total) && total > 0 ? total : null;
}

/** Seconds as `1:42:08`, or `4:12` under an hour. */
export function clock(seconds: number): string {
	const whole = Math.floor(seconds);
	const h = Math.floor(whole / 3600);
	const m = Math.floor((whole % 3600) / 60);
	const s = whole % 60;
	const pad = (value: number) => String(value).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * A price, in the currency the publisher named.
 *
 * `Intl.NumberFormat` throws on a currency code it does not recognise, and
 * publishers write things like `"USD "` and `"$"` in that field. A bad code
 * falls back to printing the number with the raw code beside it rather than
 * taking the card down.
 */
export function money(
	amount: number | undefined,
	currency: string | undefined,
): string | undefined {
	if (amount === undefined) return undefined;
	const code = currency?.trim().toUpperCase();
	if (code && /^[A-Z]{3}$/.test(code)) {
		try {
			return new Intl.NumberFormat(undefined, {
				style: "currency",
				currency: code,
				maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
			}).format(amount);
		} catch {
			// Fall through to the plain form.
		}
	}
	const rounded = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
	return code ? `${rounded} ${code}` : rounded;
}

/** `https://schema.org/InStock` → `IN STOCK`. Also accepts the bare token. */
export function enumLabel(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const token = value.split("/").pop()?.split("#").pop();
	if (!token) return undefined;
	return token
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
		.toUpperCase();
}

/** `2026-10-14` → `{ month: "OCT", day: "14", weekday: "TUE" }`. */
export function dayParts(value: Date): {
	month: string;
	day: string;
	weekday: string;
} {
	return {
		month: value.toLocaleString(undefined, { month: "short" }).toUpperCase(),
		day: String(value.getDate()),
		weekday: value
			.toLocaleString(undefined, { weekday: "short" })
			.toUpperCase(),
	};
}

/**
 * How long ago, in the design's mono voice: `2H AGO`, `YESTERDAY`, `MAR 2026`.
 *
 * Deliberately coarse. A publisher's `datePublished` is accurate to the second
 * and trustworthy to about the day, and "14 MINUTES AGO" on a date that was
 * actually set by a CMS at build time is a precision nobody earned.
 */
export function ago(when: Date, now: Date = new Date()): string {
	const seconds = Math.max(0, (now.getTime() - when.getTime()) / 1000);
	if (seconds < 3600) {
		const minutes = Math.max(1, Math.floor(seconds / 60));
		return `${minutes} MIN AGO`;
	}
	if (seconds < 86_400) return `${Math.floor(seconds / 3600)}H AGO`;
	if (seconds < 172_800) return "YESTERDAY";
	if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} DAYS AGO`;
	return when
		.toLocaleString(undefined, { month: "short", year: "numeric" })
		.toUpperCase();
}

/** A `Date` from the wire's seconds-since-epoch, rejecting the zero sentinel. */
export function fromEpoch(seconds: number | undefined): Date | null {
	if (!seconds) return null;
	return date(new Date(seconds * 1000).toISOString());
}

/**
 * A URL safe to put in an `href`.
 *
 * The API validates every URL it extracts, and this checks again anyway. It
 * costs a `new URL()` and it means no future path into this file — a fixture, a
 * field nobody has audited, a shape that changes upstream — can put a
 * `javascript:` value behind a link.
 */
export function href(value: string | undefined): string | undefined {
	if (!value) return undefined;
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:"
			? parsed.toString()
			: undefined;
	} catch {
		return undefined;
	}
}
