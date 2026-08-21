import {
	firstMarked,
	href,
	marked,
	money,
	node,
	nodes,
	num,
	str,
	strs,
} from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * What it is, and where it can be watched.
 *
 * The where-to-watch rows are the reason this module is worth having, and they
 * are also the part most easily faked. Each one here is an `Offer` published on
 * a page in the results — a platform's own listing saying it carries this
 * title — labelled with that platform's domain. There is no availability
 * database behind it, so the rows are whichever platforms happened to rank, not
 * an exhaustive list, and the footer says so rather than implying completeness.
 *
 * The design's card is also regionalised — `AVAILABILITY FOR UNITED KINGDOM`.
 * Nothing here knows the reader's region and nothing here is going to find out
 * from their address, so that line does not appear.
 */
export function readEntertainment(run: SearchRun): ResultModule | null {
	const lead = firstMarked(run.sources, "Movie", "TVSeries");
	if (!lead) return null;

	const title = str(lead.node, "name");
	if (!title) return null;

	const meta: string[] = [];
	const released = str(lead.node, "datePublished")?.slice(0, 4);
	if (released) meta.push(released);
	const episodes = str(lead.node, "numberOfEpisodes");
	if (episodes) meta.push(`${episodes} EPISODES`);
	const seasons = str(lead.node, "numberOfSeasons");
	if (seasons && !episodes) meta.push(`${seasons} SEASONS`);
	const contentRating = str(lead.node, "contentRating");
	if (contentRating) meta.push(contentRating.toUpperCase());

	const chips: string[] = [];
	const rating = node(lead.node, "aggregateRating");
	const value = str(rating, "ratingValue");
	if (value) {
		const best = str(rating, "bestRating");
		chips.push(`${value}${best ? `/${best}` : ""} RATED`);
	}
	for (const genre of strs(lead.node, "genre").slice(0, 2)) {
		chips.push(genre.toUpperCase());
	}

	// Every platform in the results that published an offer for something.
	const where = marked(run.sources, "Movie", "TVSeries", "Product")
		.flatMap((entry) =>
			nodes(entry.node, "offers").map((offer) => {
				const price = money(
					num(offer, "price") ?? num(offer, "lowPrice"),
					str(offer, "priceCurrency"),
				);
				return {
					name: entry.source.domain.replace(/^www\./, ""),
					detail: price ?? "Subscription",
					url: href(str(offer, "url")) ?? entry.source.url,
				};
			}),
		)
		.slice(0, 4);

	return {
		kind: "entertainment",
		title,
		poster: href(str(lead.node, "image")) ?? lead.source.image,
		meta,
		chips: chips.slice(0, 3),
		description: str(lead.node, "description"),
		where,
		provenance: where.length
			? "PLATFORMS THAT APPEARED IN THESE RESULTS · NOT AN EXHAUSTIVE LIST"
			: `FROM ${lead.source.domain.toUpperCase()}`,
	};
}
