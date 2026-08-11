import { site } from "@/lib/site";

/**
 * The account entry point.
 *
 * The design draws a signed-in avatar with initials. There is no session on
 * this host yet, so this renders the same 26px pill as a link to the
 * dashboard, where accounts actually live — a fabricated set of initials would
 * be the surface asserting a signed-in user it knows nothing about.
 */
export function AccountChip() {
	return (
		<a
			className="flex h-[26px] w-[26px] items-center justify-center rounded-pill bg-ink-0 text-paper-0 transition-opacity duration-fast ease-out hover:opacity-80"
			href={site.dashboard}
			rel="noreferrer"
			target="_blank"
		>
			<span className="sr-only">Your Cheela account</span>
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
		</a>
	);
}
