import {
	date,
	enumLabel,
	firstMarked,
	money,
	named,
	node,
	num,
	str,
} from "../structured";
import type { SearchRun } from "../types";
import type { Fact, ResultModule } from "./index";

/**
 * When and where, from the page that is organising it.
 *
 * `Event` is one of the schema.org types publishers reliably get right, because
 * they are publishing it to be picked up: a conference page that wants to show
 * in a calendar writes `startDate` correctly or it does not show at all. That
 * makes this among the most trustworthy modules here, and it is still a
 * publisher's claim about their own event rather than a fact — the card is
 * attributed to the domain throughout.
 *
 * A date and a name are required. An event card with no date is a link.
 */
export function readEvent(run: SearchRun): ResultModule | null {
	const marked = firstMarked(run.sources, "Event");
	if (!marked) return null;

	const name = str(marked.node, "name");
	const start = date(str(marked.node, "startDate"));
	if (!name || !start) return null;

	const end = date(str(marked.node, "endDate"));
	const place = node(marked.node, "location");

	const chips: string[] = [];
	const offer = node(marked.node, "offers");
	const price = money(
		num(offer, "price") ?? num(offer, "lowPrice"),
		str(offer, "priceCurrency"),
	);
	const availability = enumLabel(str(offer, "availability"));
	if (availability) chips.push(availability);
	const attendance = enumLabel(
		str(marked.node, "eventAttendanceMode"),
	)?.replace(/\s*EVENT ATTENDANCE MODE$/, "");
	if (attendance) chips.push(attendance);
	if (price) chips.push(`FROM ${price.toUpperCase()}`);
	const status = enumLabel(str(marked.node, "eventStatus"))?.replace(
		/^EVENT\s+/,
		"",
	);
	if (status && status !== "SCHEDULED") chips.push(status);

	const facts: Fact[] = [];
	const performer = named(marked.node, "performer");
	if (performer) facts.push({ label: "Performing", value: performer });
	const organizer = named(marked.node, "organizer");
	if (organizer) facts.push({ label: "Organised by", value: organizer });
	if (end && end.getTime() > start.getTime()) {
		const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
		if (days >= 1) facts.push({ label: "Runs", value: `${days + 1} days` });
	}

	return {
		kind: "event",
		name,
		start,
		end: end ?? undefined,
		venue: str(place, "name") ?? named(marked.node, "location"),
		locality:
			str(place, "addressLocality") ??
			str(node(place, "address"), "addressLocality"),
		chips: chips.slice(0, 3),
		facts,
		url: marked.source.url,
		provenance: `PUBLISHED BY ${marked.source.domain.toUpperCase()}`,
	};
}
