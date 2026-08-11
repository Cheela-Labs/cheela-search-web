"use client";

import { useEffect, useState } from "react";

/** Below Tailwind's `lg`, where the sources rail has no room and becomes a sheet. */
const COMPACT = "(max-width: 1023.98px)";

/**
 * Whether the sources belong in a sheet rather than the rail.
 *
 * This has to be known in JavaScript, not only in CSS, because the sheet is a
 * modal `<dialog>`. Hiding an *open* one with `lg:hidden` does not undo
 * `showModal()`: the dialog stays `:modal`, and everything outside it stays
 * inert — so on a desktop viewport, opening a citation made the invisible
 * sheet swallow every click on the page. Mounting the sheet only when it is
 * the actual presentation is the fix, and it also stops two evidence panels
 * from being rendered for one selection.
 *
 * Starts false so the server render and the first client render agree. Nothing
 * visible depends on it at that point — the rail is `hidden lg:flex` in CSS
 * either way, and the sheet cannot be open before an interaction.
 */
export function useIsCompact(): boolean {
	const [compact, setCompact] = useState(false);

	useEffect(() => {
		const query = window.matchMedia(COMPACT);
		const sync = () => setCompact(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	return compact;
}
