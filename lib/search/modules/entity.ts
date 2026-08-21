import { firstMarked, str, strs } from "../structured";
import type { SearchRun } from "../types";
import type { Fact, ResultModule } from "./index";

/**
 * The knowledge card: what this thing is, in one line, with its own facts.
 *
 * `information` is both the default intent and the largest bucket — every
 * query the classifier is unsure about lands here — so this is the module that
 * renders most often, and the one whose refusal has to be cheapest.
 *
 * ## Its description is the whole card
 *
 * A name and a type describe nothing. "Redis · SoftwareApplication" is a row in
 * a database, not an answer. The card requires a description and abstains
 * without one, because everything else it can show — a version, a category, a
 * link — is a caption for a sentence that has to exist first.
 *
 * The description comes from `graph.entities`, written by the crawler out of
 * publishers' own `Organization` and `SoftwareApplication` markup, longest
 * wins. The registry selected around that column for months, which is why this
 * card could not be built until now.
 *
 * ## What is deliberately not here
 *
 * The design's information artboard carries an image grid — an architecture
 * diagram, a console, a mark. Nothing in this system holds pictures *of* an
 * entity. What it holds is one `og:image` per result page, and a grid of those
 * beside an entity's name would assert that they depict it, which is the exact
 * fallacy `places-grid.tsx` documents. The card ships without the grid rather
 * than with a plausible one.
 */

/** Facts worth a row, in the order the design reads them. */
const FACTS: { prop: string; label: string }[] = [
	{ prop: "applicationCategory", label: "Category" },
	{ prop: "softwareVersion", label: "Latest" },
	{ prop: "version", label: "Version" },
	{ prop: "operatingSystem", label: "Runs on" },
	{ prop: "programmingLanguage", label: "Written in" },
	{ prop: "genre", label: "Genre" },
	{ prop: "datePublished", label: "Released" },
];

export function readEntity(run: SearchRun): ResultModule | null {
	// The graph's own record first. Failing that, a publisher's self-description
	// from the top result — a page that says what it is in `Organization` markup
	// is answering the same question, just without the graph having read it yet.
	const known = run.entities.find((entity) => entity.description);
	const marked = firstMarked(
		run.sources,
		"SoftwareApplication",
		"Organization",
	);

	const name = known?.name ?? str(marked?.node, "name");
	const description =
		known?.description ??
		str(marked?.node, "description") ??
		// Not `Source.snippet`: a snippet is an extract chosen for this query,
		// and a knowledge card describes the thing regardless of what was asked.
		undefined;

	if (!name || !description) return null;

	const facts: Fact[] = [];
	for (const { prop, label } of FACTS) {
		const value = str(marked?.node, prop);
		if (value && facts.length < 5) facts.push({ label, value });
	}

	const type = known?.type ?? marked?.node.type ?? "";
	const label = type
		? `ENTITY · ${type.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase()}`
		: "ENTITY";

	const domain = known?.officialDomain ?? marked?.source.domain;

	return {
		kind: "entity",
		label,
		name,
		description,
		facts,
		url: known?.officialUrl ?? marked?.source.url,
		favicon: known?.faviconUrl,
		sameAs: (known?.sameAs ?? strs(marked?.node, "sameAs")).slice(0, 4),
		provenance: domain
			? `IDENTITY RESOLVED TO ${domain.toUpperCase()}`
			: "FROM THE KNOWLEDGE GRAPH",
	};
}
