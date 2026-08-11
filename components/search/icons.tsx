/**
 * The five glyphs this surface uses.
 *
 * Inline rather than an icon package: at five icons a dependency costs more
 * than it saves, and these need to inherit `currentColor` and stroke width
 * from the control they sit in.
 */

type IconProps = { className?: string };

export function ArrowUpIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height="16"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.75"
			viewBox="0 0 16 16"
			width="16"
		>
			<path d="M8 13V3M8 3 3.5 7.5M8 3l4.5 4.5" />
		</svg>
	);
}

export function MicIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height="18"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.4"
			viewBox="0 0 18 18"
			width="18"
		>
			<rect height="8" rx="2.2" width="4.4" x="6.8" y="2.4" />
			<path d="M4 8.2a5 5 0 0 0 10 0M9 13.2v2.4" />
		</svg>
	);
}

export function CloseIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height="16"
			stroke="currentColor"
			strokeLinecap="round"
			strokeWidth="1.6"
			viewBox="0 0 16 16"
			width="16"
		>
			<path d="m4 4 8 8M12 4l-8 8" />
		</svg>
	);
}

export function ExternalIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height="14"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.5"
			viewBox="0 0 14 14"
			width="14"
		>
			<path d="M5.5 2.5h6v6M11.5 2.5 6 8M11 8.5v3h-8.5V3h3" />
		</svg>
	);
}

export function ArrowRightIcon({ className }: IconProps) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			height="14"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.6"
			viewBox="0 0 14 14"
			width="14"
		>
			<path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
		</svg>
	);
}
