import { marked, node, nodes, str } from "../structured";
import type { SearchRun, StructuredNode } from "../types";
import type { ResultModule } from "./index";

/**
 * Where these places are, from each venue's own page.
 *
 * ## Two things the design shows that are not here
 *
 * **The map crop.** There is no tile source in this system, and a static map is
 * a third-party image request keyed to a location — precisely what
 * `/api/favicon` exists to avoid doing to a reader.
 *
 * **The distance column.** `240 m` requires knowing where the reader is. The
 * design's own footer says how it would be obtained — `LOCATION APPROXIMATE,
 * FROM IP` — and that is a privacy decision, not a rendering one. A search
 * surface should not start geolocating people because a card has a column to
 * fill. Address and opening hours are what a venue published about itself, and
 * those are here.
 */

/** `Mo-Fr 07:00-17:00` from an `OpeningHoursSpecification`, or the raw string. */
function hoursOf(venue: StructuredNode): string | undefined {
	const spec = nodes(venue, "openingHoursSpecification")
		.map((entry) => {
			const days = str(entry, "dayOfWeek")?.split("/").pop();
			const opens = str(entry, "opens");
			const closes = str(entry, "closes");
			if (!opens || !closes) return null;
			return `${days ? `${days.slice(0, 3)} ` : ""}${opens}–${closes}`;
		})
		.filter((entry): entry is string => Boolean(entry));
	if (spec.length > 0) return spec.slice(0, 2).join(" · ");
	return str(venue, "openingHours");
}

/** A one-line address from a `PostalAddress`, or the string a page wrote. */
function addressOf(venue: StructuredNode): string | undefined {
	const postal = node(venue, "address");
	if (!postal) return str(venue, "address");
	const parts = [
		str(postal, "streetAddress"),
		str(postal, "addressLocality"),
		str(postal, "postalCode"),
	].filter(Boolean);
	return parts.length > 0 ? parts.join(", ") : undefined;
}

export function readLocal(run: SearchRun): ResultModule | null {
	const venues = marked(run.sources, "LocalBusiness")
		.map((entry) => {
			const name = str(entry.node, "name") ?? entry.source.title;
			const address = addressOf(entry.node);
			// An address is the primary element. A row without one is a rail row.
			if (!name || !address) return null;
			return {
				name,
				address,
				telephone: str(entry.node, "telephone"),
				hours: hoursOf(entry.node),
				url: entry.source.url,
			};
		})
		.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
		.slice(0, 5);

	if (venues.length === 0) return null;

	return {
		kind: "local",
		venues,
		provenance: "ADDRESSES AND HOURS AS EACH VENUE PUBLISHES THEM",
	};
}
