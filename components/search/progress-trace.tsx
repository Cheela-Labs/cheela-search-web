import { cn } from "@/lib/cn";
import type { Stage } from "@/lib/search/types";

/**
 * What the engine is doing, in place of a spinner.
 *
 * A spinner says "wait" and nothing else. These lines say which stage is
 * running and what the previous ones returned, which is the difference between
 * two seconds that feel slow and two seconds that feel like work.
 *
 * `aria-live="polite"` because the same information has to reach a screen
 * reader, and it is the only signal that the query was accepted at all until
 * the first block lands.
 */
export function ProgressTrace({ stages }: { stages: Stage[] }) {
	if (!stages.length) return null;

	return (
		<ul
			aria-live="polite"
			className="flex flex-col gap-2.5 text-base"
			// The trace is a running commentary; a reader that announces each
			// line as it changes is right, one that re-reads the whole list is not.
			aria-relevant="additions"
		>
			{stages.map((stage) => (
				<li
					className={cn(
						"flex items-center gap-2.5 sm:gap-3",
						stage.state === "active"
							? "font-medium text-fg-primary"
							: "text-fg-tertiary",
					)}
					key={stage.id}
				>
					<span
						className={cn(
							"h-1.5 w-1.5 shrink-0 rounded-pill",
							stage.state === "active"
								? "stage-pulse bg-accent"
								: "bg-fg-tertiary",
						)}
					/>
					<span>{stage.label}</span>
				</li>
			))}
		</ul>
	);
}
