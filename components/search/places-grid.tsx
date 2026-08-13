"use client";

import { useState } from "react";
import type { Place } from "@/lib/search/types";

/**
 * The visual row for discovery queries: where to actually go.
 *
 * ## Why this only appears for discovery
 *
 * "nike jordans" and "why are jordans expensive" retrieve similar pages and want
 * completely different things from them. The second wants prose. The first wants
 * destinations — and a paragraph explaining the sneaker's history is a worse
 * answer than four links a reader can recognise at a glance. So discovery gets
 * the pictures and everything else keeps the rail, which is the same evidence
 * shown at the weight the intent deserves.
 *
 * ## A place is not a source
 *
 * These cards are not the citation rail with pictures on it. The pages a
 * shopping query most wants to show are the ones that cannot be read at all —
 * eight of twelve retrieved for "nike jordans" extracted nothing, because a
 * storefront renders its catalogue in JavaScript. Those pages can never be
 * cited and nothing here claims they said anything. They answered, they have a
 * host, and they published a title and an image, which is all a link needs.
 *
 * ## What these images are, and what they are not
 *
 * Each is the `og:image` of the page its card links to — the page's own
 * self-description, fetched from that page. That is the whole reason it can be
 * shown next to that link.
 *
 * The tempting alternative is worth naming because it looks identical to a
 * reader and is a lie: search providers return a bag of query-matched images
 * alongside their results, and pairing image *n* with result *n* produces a
 * beautiful grid asserting a relationship that does not exist. Measured on a
 * live "nike jordans buy india" query, four of five returned images were hosted
 * by a retailer that was not in the results at all.
 *
 * These are also not product cards. There is no price here because the pages
 * search engines return for a shopping query are storefront and category pages,
 * not product pages — sixteen live results across three shopping queries carried
 * zero `Product` offers between them. A card claiming "₹12,995" it had not read
 * would be inventing the one number the reader most needs to trust.
 */

/** Enough to fill the row twice over without turning the answer into a catalogue. */
const MAX_CARDS = 6;

function PlaceCard({ place }: { place: Place }) {
	// Third-party images fail in ways nothing here controls: hotlink protection,
	// a CDN that has moved on, a tag pointing at a since-deleted asset. A broken
	// image icon is worse than the swatch, so failure falls back rather than
	// showing the browser's placeholder.
	const [failed, setFailed] = useState(false);
	const image = failed ? undefined : place.image;

	return (
		<a
			className="fade-in group flex flex-col overflow-hidden rounded-md border border-border-default bg-bg-page transition-colors duration-fast ease-out hover:border-border-strong"
			href={place.url}
			rel="noopener noreferrer"
			target="_blank"
		>
			{/*
			  The box is reserved whether or not an image arrives. An aspect-ratio
			  container is what keeps a third-party image from being the
			  layout-shift source the swatch was chosen to avoid — the row is the
			  same height before, during and after loading.
			*/}
			<span
				className="relative block aspect-[16/10] w-full overflow-hidden bg-bg-sunken"
				style={image ? undefined : { background: place.swatch, opacity: 0.14 }}
			>
				{image ? (
					// biome-ignore lint/performance/noImgElement: next/image needs every image host allow-listed ahead of time, and these hosts are arbitrary — whichever retailers the query happens to retrieve. Its proxy is also the opposite of what the referrer policy below is for.
					<img
						alt=""
						// `contain`, not `cover`. What a storefront puts in its `og:image`
						// is usually a logo or a wide banner, and cropping one to fill a
						// box cuts the brand mark in half — the single thing on the card
						// a reader recognises. Letterboxing a photo costs much less.
						className="h-full w-full object-contain p-3 transition-transform duration-slow ease-out group-hover:scale-[1.03]"
						decoding="async"
						loading="lazy"
						onError={() => setFailed(true)}
						// The query is in this page's URL. Without this, every retailer
						// whose image loads is told what was searched to reach them.
						referrerPolicy="no-referrer"
						src={image}
					/>
				) : null}
			</span>

			<span className="flex min-w-0 flex-col gap-1 px-3 py-2.5">
				<span className="flex items-center gap-1.5">
					<span
						className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
						style={{ background: place.swatch }}
					/>
					<span className="truncate font-mono text-2xs text-fg-tertiary">
						{place.domain}
					</span>
				</span>
				<span className="line-clamp-2 font-medium text-sm leading-snug">
					{place.title}
				</span>
			</span>
		</a>
	);
}

export function PlacesGrid({ places }: { places: Place[] }) {
	// Taken in the order given. The pipeline ranks these — results from the
	// places-seeking search first, pictures second — and it is the side that
	// knows which search each one came from.
	const shown = places.slice(0, MAX_CARDS);

	// One lonely card is a worse answer than none: the row exists to be scanned
	// across, and a single result is already the first line of the answer.
	if (shown.length < 2) return null;

	return (
		<section className="w-full max-w-[720px]">
			<h2 className="font-mono text-2xs text-fg-tertiary tracking-wide">
				WHERE TO GO
			</h2>
			<div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
				{shown.map((place) => (
					<PlaceCard key={place.id} place={place} />
				))}
			</div>
		</section>
	);
}
