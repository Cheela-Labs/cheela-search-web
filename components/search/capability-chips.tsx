import { cn } from "@/lib/cn";
import type { CapabilityRef } from "@/lib/search/types";

/**
 * What a source's domain says it can do.
 *
 * **Nothing here is clickable, and that is the design rather than an
 * unfinished state.** This phase is pure information gain: the chips exist to
 * measure whether people want actions at all, before an invoker exists to
 * perform them. A chip that looked like a button would be promising something
 * the system cannot do yet.
 *
 * The tier badge is derived by the query plane from the capability's structure
 * — the verb in its name, the shape of its call — and never from the
 * manifest's own prose. A site describing `deleteAllRecords` as "safely
 * previews your data" does not get to relabel it here.
 */

const TIER_LABEL: Record<CapabilityRef["effects"], string> = {
	read: "reads",
	"write-reversible": "changes",
	"write-irreversible": "deletes",
	financial: "pays",
	unknown: "unclear",
};

/**
 * Colour carries the tier, and the label repeats it in words.
 *
 * Deliberately redundant: roughly one in twelve men cannot separate the red
 * from the amber, and "deletes" is exactly the distinction that must not depend
 * on that.
 */
const TIER_STYLE: Record<CapabilityRef["effects"], string> = {
	read: "border-border-default text-fg-tertiary",
	"write-reversible": "border-amber-500/40 text-amber-700 dark:text-amber-400",
	"write-irreversible": "border-red-500/40 text-red-700 dark:text-red-400",
	financial: "border-red-500/50 text-red-700 dark:text-red-400",
	unknown: "border-border-default text-fg-tertiary",
};

/** Beyond this the rail becomes a list of tools rather than a search result. */
const SHOWN = 4;

export function CapabilityChips({
	capabilities,
}: {
	capabilities: CapabilityRef[];
}) {
	if (capabilities.length === 0) return null;

	/*
	  Reads first, then everything else in the order the index returned.

	  The alternative — most-severe first — puts "deletes" at the top of every
	  card that has one, which reads as a warning about the *site* rather than a
	  description of it. What a site mostly does is the honest summary; the
	  severe ones are still visible and still marked.
	*/
	const ordered = [...capabilities].sort((a, b) =>
		a.effects === "read" && b.effects !== "read"
			? -1
			: b.effects === "read" && a.effects !== "read"
				? 1
				: 0,
	);
	const shown = ordered.slice(0, SHOWN);
	const rest = ordered.length - shown.length;

	return (
		<span className="mt-2 flex flex-wrap items-center gap-1">
			{shown.map((capability) => (
				<span
					className={cn(
						"inline-flex items-center gap-1 rounded-pill border px-1.5 py-[1px] font-mono text-[10px] leading-[14px]",
						TIER_STYLE[capability.effects],
					)}
					key={`${capability.domain}:${capability.invocationName}`}
					// The tier in words, for anyone who cannot use the colour and for
					// anyone hovering to check what a chip means.
					title={`${capability.invocationName} — ${TIER_LABEL[capability.effects]}${
						capability.callable ? "" : " (transport not supported)"
					}`}
				>
					<span className="truncate max-w-[12rem]">
						{capability.invocationName}
					</span>
					<span aria-hidden="true" className="opacity-60">
						{TIER_LABEL[capability.effects]}
					</span>
				</span>
			))}

			{rest > 0 ? (
				<span className="font-mono text-[10px] text-fg-tertiary leading-[14px]">
					+{rest} more
				</span>
			) : null}
		</span>
	);
}
