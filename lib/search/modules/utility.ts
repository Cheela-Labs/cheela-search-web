import type { SearchRun } from "../types";
import type { Fact, ResultModule } from "./index";

/**
 * The one module with no sources, because it needs none.
 *
 * A conversion is arithmetic. Retrieving a page that performs it, ranking that
 * page against nineteen others and composing a paragraph about it is a great
 * deal of machinery to answer "450 gb to tb", and every step of it is a chance
 * to be wrong about a number the reader can check in their head.
 *
 * So this reads the query and computes. Nothing is fetched, nothing is cited,
 * and the footer says so — the design's own line is `COMPUTED LOCALLY · NO
 * SOURCES NEEDED`. It is also the only module here that cannot be stale.
 *
 * ## Bytes are two units with one name
 *
 * `GB` means 10^9 and `GiB` means 2^30, and storage vendors and operating
 * systems disagree about which one they are printing. A converter that silently
 * picks one is the reason people think their disk arrived short. Both are
 * shown: the decimal answer as the headline because `GB` was what was typed,
 * the binary one in the rows beside it.
 */

type Unit = {
	/** How many base units one of these is. Unused for temperature. */
	factor: number;
	dimension: string;
	label: string;
};

/** Every spelling that resolves to a unit, lowercased. */
const UNITS: Record<string, Unit> = {};

function define(unit: Unit, ...names: string[]): void {
	for (const name of names) UNITS[name] = unit;
}

// -- Data. Base: the byte. ---------------------------------------------------
define({ factor: 1, dimension: "data", label: "Bytes" }, "b", "byte", "bytes");
define(
	{ factor: 1e3, dimension: "data", label: "Kilobytes" },
	"kb",
	"kilobyte",
	"kilobytes",
);
define(
	{ factor: 1e6, dimension: "data", label: "Megabytes" },
	"mb",
	"megabyte",
	"megabytes",
);
define(
	{ factor: 1e9, dimension: "data", label: "Gigabytes" },
	"gb",
	"gigabyte",
	"gigabytes",
);
define(
	{ factor: 1e12, dimension: "data", label: "Terabytes" },
	"tb",
	"terabyte",
	"terabytes",
);
define(
	{ factor: 1e15, dimension: "data", label: "Petabytes" },
	"pb",
	"petabyte",
	"petabytes",
);
define(
	{ factor: 1024 ** 1, dimension: "data", label: "Kibibytes" },
	"kib",
	"kibibyte",
	"kibibytes",
);
define(
	{ factor: 1024 ** 2, dimension: "data", label: "Mebibytes" },
	"mib",
	"mebibyte",
	"mebibytes",
);
define(
	{ factor: 1024 ** 3, dimension: "data", label: "Gibibytes" },
	"gib",
	"gibibyte",
	"gibibytes",
);
define(
	{ factor: 1024 ** 4, dimension: "data", label: "Tebibytes" },
	"tib",
	"tebibyte",
	"tebibytes",
);

// -- Length. Base: the metre. ------------------------------------------------
define(
	{ factor: 0.001, dimension: "length", label: "Millimetres" },
	"mm",
	"millimetre",
	"millimetres",
	"millimeter",
	"millimeters",
);
define(
	{ factor: 0.01, dimension: "length", label: "Centimetres" },
	"cm",
	"centimetre",
	"centimetres",
	"centimeter",
	"centimeters",
);
define(
	{ factor: 1, dimension: "length", label: "Metres" },
	"m",
	"metre",
	"metres",
	"meter",
	"meters",
);
define(
	{ factor: 1000, dimension: "length", label: "Kilometres" },
	"km",
	"kilometre",
	"kilometres",
	"kilometer",
	"kilometers",
);
define(
	{ factor: 0.0254, dimension: "length", label: "Inches" },
	"in",
	"inch",
	"inches",
);
define(
	{ factor: 0.3048, dimension: "length", label: "Feet" },
	"ft",
	"foot",
	"feet",
);
define(
	{ factor: 0.9144, dimension: "length", label: "Yards" },
	"yd",
	"yard",
	"yards",
);
define(
	{ factor: 1609.344, dimension: "length", label: "Miles" },
	"mi",
	"mile",
	"miles",
);

// -- Mass. Base: the gram. ---------------------------------------------------
define({ factor: 1, dimension: "mass", label: "Grams" }, "g", "gram", "grams");
define(
	{ factor: 1000, dimension: "mass", label: "Kilograms" },
	"kg",
	"kilogram",
	"kilograms",
);
define(
	{ factor: 1e6, dimension: "mass", label: "Tonnes" },
	"t",
	"tonne",
	"tonnes",
);
define(
	{ factor: 28.349523125, dimension: "mass", label: "Ounces" },
	"oz",
	"ounce",
	"ounces",
);
define(
	{ factor: 453.59237, dimension: "mass", label: "Pounds" },
	"lb",
	"lbs",
	"pound",
	"pounds",
);
define(
	{ factor: 6350.29318, dimension: "mass", label: "Stone" },
	"st",
	"stone",
	"stones",
);

// -- Time. Base: the second. -------------------------------------------------
define(
	{ factor: 0.001, dimension: "time", label: "Milliseconds" },
	"ms",
	"millisecond",
	"milliseconds",
);
define(
	{ factor: 1, dimension: "time", label: "Seconds" },
	"s",
	"sec",
	"secs",
	"second",
	"seconds",
);
define(
	{ factor: 60, dimension: "time", label: "Minutes" },
	"min",
	"mins",
	"minute",
	"minutes",
);
define(
	{ factor: 3600, dimension: "time", label: "Hours" },
	"h",
	"hr",
	"hrs",
	"hour",
	"hours",
);
define(
	{ factor: 86_400, dimension: "time", label: "Days" },
	"d",
	"day",
	"days",
);
define(
	{ factor: 604_800, dimension: "time", label: "Weeks" },
	"wk",
	"week",
	"weeks",
);

// -- Temperature. Handled by `toCelsius`/`fromCelsius`, not by a factor. -----
define(
	{ factor: 0, dimension: "temperature", label: "Celsius" },
	"c",
	"°c",
	"celsius",
	"centigrade",
);
define(
	{ factor: 0, dimension: "temperature", label: "Fahrenheit" },
	"f",
	"°f",
	"fahrenheit",
);
define({ factor: 0, dimension: "temperature", label: "Kelvin" }, "k", "kelvin");

const toCelsius = (value: number, label: string): number =>
	label === "Fahrenheit"
		? ((value - 32) * 5) / 9
		: label === "Kelvin"
			? value - 273.15
			: value;

const fromCelsius = (value: number, label: string): number =>
	label === "Fahrenheit"
		? (value * 9) / 5 + 32
		: label === "Kelvin"
			? value + 273.15
			: value;

/**
 * `450 gb to tb`, `10 km in miles`, `72f to c`, `3 hours in minutes`.
 *
 * Deliberately strict. Anything that is not unambiguously a conversion falls
 * through to a real search, which is the right outcome — a query this misreads
 * would replace a page of results with a wrong number.
 */
const QUERY =
	/^\s*(-?[\d.,]+)\s*([a-z°]+)\s+(?:to|in|as|into)\s+([a-z°]+)\s*$/i;

/** Enough digits to be exact where it can be, without printing float noise. */
function present(value: number): string {
	if (!Number.isFinite(value)) return "";
	const magnitude = Math.abs(value);
	const digits =
		magnitude === 0 ? 0 : magnitude < 1 ? 6 : magnitude < 1000 ? 4 : 2;
	const rounded = Number(value.toFixed(digits));
	return rounded.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function readUtility(run: SearchRun): ResultModule | null {
	const match = QUERY.exec(run.query);
	if (!match) return null;

	const amount = Number(match[1].replace(/,/g, ""));
	if (!Number.isFinite(amount)) return null;

	const from = UNITS[match[2].toLowerCase()];
	const to = UNITS[match[3].toLowerCase()];
	// Same dimension or it is not a conversion. "10 kg to miles" is a question
	// about nothing, and answering it with a number would be worse than not.
	if (!from || !to || from.dimension !== to.dimension || from === to) {
		return null;
	}

	const converted =
		from.dimension === "temperature"
			? fromCelsius(toCelsius(amount, from.label), to.label)
			: (amount * from.factor) / to.factor;

	/*
	  The other units of the same dimension, nearest first.

	  Ordered by how close each result is to the answer rather than by however
	  the table happens to be written, and that ordering is load-bearing for the
	  case this module was built for. Taken in definition order, "450 gb to tb"
	  offered bytes, kilobytes and megabytes — 450,000,000,000 and two more walls
	  of digits — and never reached GiB or TiB at all, because the binary units
	  are defined after the decimal ones and only three rows are shown.

	  That is the one thing a reader converting storage actually needs. `GB`
	  means 10^9 and `GiB` means 2^30; vendors and operating systems disagree
	  about which they are printing, and a converter that silently picks one is
	  why people think their disk arrived short. Sorting by proximity puts the
	  binary neighbour of the answer first because it is the nearest value there
	  is — it falls out of the ordering rather than needing a special case.
	*/
	const candidates: (Fact & { distance: number })[] = [];
	const seen = new Set([from.label, to.label]);
	for (const unit of Object.values(UNITS)) {
		if (unit.dimension !== from.dimension || seen.has(unit.label)) continue;
		seen.add(unit.label);
		const value =
			from.dimension === "temperature"
				? fromCelsius(toCelsius(amount, from.label), unit.label)
				: (amount * from.factor) / unit.factor;
		// Skip anything that would render as a wall of zeroes or of digits.
		const magnitude = Math.abs(value);
		if (magnitude !== 0 && (magnitude < 1e-4 || magnitude > 1e12)) continue;
		candidates.push({
			label: unit.label.toUpperCase(),
			value: present(value),
			// Distance in orders of magnitude from the answer, so "close" means
			// the same ballpark rather than the same arithmetic difference.
			distance: Math.abs(
				Math.log10(Math.abs(value) || 1) - Math.log10(Math.abs(converted) || 1),
			),
		});
	}
	const alternates: Fact[] = candidates
		.sort((a, b) => a.distance - b.distance)
		.slice(0, 3)
		.map(({ label, value }) => ({ label, value }));

	return {
		kind: "utility",
		from: { value: present(amount), unit: from.label.toUpperCase() },
		to: { value: present(converted), unit: to.label.toUpperCase() },
		alternates,
		provenance: "COMPUTED LOCALLY · NO SOURCES NEEDED",
	};
}
