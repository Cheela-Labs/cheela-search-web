import {
	enumLabel,
	href,
	marked,
	money,
	named,
	node,
	nodes,
	num,
	str,
} from "../structured";
import type { SearchRun, Source } from "../types";
import type { ResultModule } from "./index";

/**
 * A price, and who is asking it.
 *
 * ## Why this is allowed to show a price when `PlacesGrid` refuses to
 *
 * That component's comment is emphatic and correct: *"A card claiming '₹12,995'
 * it had not read would be inventing the one number the reader most needs to
 * trust."* Its measurement stands too — sixteen live results across three
 * shopping queries carried zero `Product` offers between them.
 *
 * The difference is where the number comes from. There, a price would have been
 * matched to a link from somewhere else. Here it is read off an `Offer` node the
 * seller published on the page the row links to, and the row is labelled with
 * that seller's own domain. Every price is a quoted claim, attributed, from the
 * page it is a link to. When no result publishes one, this returns `null` and
 * the reader gets the answer and the rail — which, on today's index, is what
 * usually happens.
 *
 * ## The delivery column is missing on purpose
 *
 * The design shows seller, price, delivery and stock. Nothing in this system
 * knows a delivery estimate. Three of four columns is the honest table.
 */

type Row = {
	seller: string;
	price: string;
	availability?: string;
	url?: string;
};

/** An offer's own seller, falling back to the domain that published it. */
function sellerOf(offer: ReturnType<typeof node>, source: Source): string {
	return named(offer, "seller") ?? source.domain;
}

export function readShopping(run: SearchRun): ResultModule | null {
	const products = marked(run.sources, "Product");
	if (products.length === 0) return null;

	const lead = products[0];
	const name = str(lead.node, "name");
	if (!name) return null;

	// Every offer on every result, one row each. A product page routinely lists
	// several — a low and a high, or one per condition — and each is a distinct
	// claim by a distinct seller.
	const rows: Row[] = [];
	for (const entry of products) {
		const offers = [
			...nodes(entry.node, "offers"),
			// `AggregateOffer` is a range rather than an offer; its `lowPrice` is
			// the only number on it a reader can act on.
			...nodes(entry.node, "offers").flatMap((offer) => nodes(offer, "offers")),
		];
		for (const offer of offers) {
			const price = money(
				num(offer, "price") ?? num(offer, "lowPrice"),
				str(offer, "priceCurrency"),
			);
			if (!price) continue;
			rows.push({
				seller: sellerOf(offer, entry.source),
				price,
				availability: enumLabel(str(offer, "availability")),
				url: href(str(offer, "url")) ?? entry.source.url,
			});
			if (rows.length >= 5) break;
		}
		if (rows.length >= 5) break;
	}

	// A product with no price is the case this module exists to decline. The
	// rail already shows the page.
	if (rows.length === 0) return null;

	const rating = node(lead.node, "aggregateRating");
	const ratingValue = str(rating, "ratingValue");

	return {
		kind: "shopping",
		name,
		image: href(str(lead.node, "image")) ?? lead.source.image,
		brand: named(lead.node, "brand"),
		description: str(lead.node, "description"),
		rating: ratingValue
			? {
					value: ratingValue,
					count: str(rating, "reviewCount") ?? str(rating, "ratingCount"),
				}
			: undefined,
		offers: rows,
		provenance: "PRICES AS EACH SELLER PUBLISHES THEM · NO AFFILIATE RANKING",
	};
}
