"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * The sources rail, on a phone.
 *
 * A native `<dialog>` opened with `showModal()` rather than a div with a
 * z-index: it gets the top layer, focus containment, Escape-to-close and
 * inert-background for free, and every hand-rolled version of those is a
 * keyboard trap waiting to happen. Positioning is in `globals.css` because the
 * UA stylesheet centres a modal dialog with `margin: auto`, which a sheet has
 * to override rather than compete with.
 */
export function SourcesSheet({
	open,
	onClose,
	children,
}: {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		// The onClick below is backdrop dismissal, not a control; its keyboard
		// equivalent is Escape, which a modal <dialog> handles natively and routes
		// through onClose.
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal — Escape is handled natively by <dialog> and routed through onClose
		<dialog
			aria-label="Results"
			className="sheet lg:hidden"
			onClick={(event) => {
				// The dialog element's box spans the backdrop; a click that lands on
				// it rather than on the panel inside is a click outside.
				if (event.target === ref.current) onClose();
			}}
			// Fires for Escape as well as for `close()`, so this is the single
			// place the parent's state gets put back in sync.
			onClose={onClose}
			ref={ref}
		>
			{open ? (
				<div className="sheet-up flex max-h-[85dvh] flex-col rounded-t-[20px] border-border-default border-t bg-bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg">
					<div className="flex shrink-0 justify-center pt-3 pb-1">
						<span className="h-1 w-9 rounded-pill bg-border-strong" />
					</div>
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						{children}
					</div>
				</div>
			) : null}
		</dialog>
	);
}
