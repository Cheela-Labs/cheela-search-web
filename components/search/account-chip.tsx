"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

type Me =
	| { signedIn: false }
	| { signedIn: true; email: string | null; initials: string };

/**
 * The account entry point.
 *
 * This rendered a generic outline linking to the dashboard, with the comment
 * "there is no session on this host yet" — which was true and is no longer.
 * The session cookie is scoped to `.cheelalabs.com`, so a visitor signed in on
 * the dashboard arrives here already signed in, and this draws them.
 *
 * **Signed out is the first paint, always.** The chip renders its outline
 * immediately and fills in when `/api/me` answers. Rendering initials
 * optimistically — or blocking the header on a fetch — would either assert a
 * user we have not verified or delay the search box behind an answer nobody is
 * waiting for. A chip that fills in a moment later is the honest version.
 */
export function AccountChip() {
	const [me, setMe] = useState<Me>({ signedIn: false });

	useEffect(() => {
		let cancelled = false;

		void fetch("/api/me", { credentials: "same-origin" })
			.then((response) => (response.ok ? response.json() : { signedIn: false }))
			.then((body: Me) => {
				if (!cancelled) setMe(body);
			})
			// A failed check means we cannot name this visitor, which is the same
			// state as signed out. There is nothing to report and nothing to retry.
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, []);

	const signedIn = me.signedIn && me.initials.length > 0;

	return (
		<a
			className="flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-ink-0 text-paper-0 transition-opacity duration-fast ease-out hover:opacity-80"
			href={site.dashboard}
			rel="noreferrer"
			target="_blank"
			// The tooltip names the account, so a shared machine shows whose
			// session is in the browser before anything is typed into the box.
			title={
				me.signedIn && me.email
					? `Signed in as ${me.email}`
					: "Your Cheela account"
			}
		>
			<span className="sr-only">
				{me.signedIn && me.email
					? `Signed in as ${me.email}`
					: "Your Cheela account"}
			</span>

			{signedIn ? (
				<span
					aria-hidden="true"
					className="font-medium text-[10px] leading-none tracking-wide"
				>
					{me.initials}
				</span>
			) : (
				<svg
					aria-hidden="true"
					fill="none"
					height="14"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="1.5"
					viewBox="0 0 14 14"
					width="14"
				>
					<circle cx="7" cy="5" r="2.4" />
					<path d="M2.6 12a4.6 4.6 0 0 1 8.8 0" />
				</svg>
			)}
		</a>
	);
}
