"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The auth card, as `Cheela Search.dc.html` draws it.
 *
 * A single centred card on the paper background — the design's own note beside
 * the frames reads *"email and password, one primary action, nothing decorative
 * around it."* Every value below is from the Cheela Labs tokens the surface
 * already uses, so this needed no new colours and no new type.
 *
 * The one place it departs from the drawing is the field border. The design
 * shows the password field with `--border-strong` and an accent caret, which is
 * a focus state drawn statically because a static frame cannot show focus. Here
 * it is a real `:focus-within`, which is the same picture when the field is
 * focused and the correct picture when it is not.
 */

export function AuthCard({
	title,
	children,
	footer,
}: {
	title: string;
	children: ReactNode;
	footer: ReactNode;
}) {
	return (
		<main className="flex min-h-dvh items-center justify-center bg-bg-page px-5 py-10">
			<div className="w-full max-w-[400px] rounded-lg border border-border-default bg-bg-surface p-6 shadow-md sm:p-8">
				{/* The mark, not a wordmark: the title says which product this is,
				    and saying it twice is the decoration the design excludes.
				    `next/image` here, unlike the result cards — this is our own
				    asset at a known path, which is exactly the case it is for. */}
				<Image
					alt=""
					className="object-contain"
					height={26}
					priority
					src="/logo-mark.svg"
					width={26}
				/>
				<h1 className="mt-[18px] font-bold text-xl leading-tight tracking-tight">
					{title}
				</h1>
				<div className="mt-[18px] flex flex-col gap-4">{children}</div>
				<div className="mt-[18px] text-center text-fg-secondary text-sm">
					{footer}
				</div>
			</div>
		</main>
	);
}

/**
 * One labelled field.
 *
 * The label is a mono eyebrow rather than a floating placeholder, which is the
 * house style everywhere else on this surface and is also the accessible one: a
 * placeholder that doubles as a label disappears the moment anybody types.
 */
export function Field({
	id,
	label,
	type,
	value,
	onChange,
	autoComplete,
	placeholder,
	required = true,
	autoFocus = false,
}: {
	id: string;
	label: string;
	type: "text" | "email" | "password";
	value: string;
	onChange: (value: string) => void;
	autoComplete: string;
	placeholder?: string;
	required?: boolean;
	autoFocus?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label
				className="font-mono text-2xs text-fg-tertiary tracking-wide"
				htmlFor={id}
			>
				{label}
			</label>
			<div
				className={cn(
					"rounded-md border border-border-default bg-bg-page transition-colors duration-fast ease-out",
					"focus-within:border-border-strong",
				)}
			>
				<input
					// biome-ignore lint/a11y/noAutofocus: the first field of a page whose only purpose is this form — moving focus there is what a reader is about to do anyway.
					autoFocus={autoFocus}
					autoComplete={autoComplete}
					className="w-full bg-transparent px-3.5 py-3 font-mono text-base outline-none placeholder:text-fg-tertiary"
					id={id}
					name={id}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					required={required}
					type={type}
					value={value}
				/>
			</div>
		</div>
	);
}

/** The primary action. Ink on paper, the design's one filled control. */
export function SubmitButton({
	children,
	busy,
}: {
	children: ReactNode;
	busy: boolean;
}) {
	return (
		<button
			className={cn(
				"mt-0.5 flex w-full items-center justify-center rounded-md bg-ink-0 px-4 py-3.5 font-medium text-base text-paper-0",
				"transition-opacity duration-fast ease-out hover:opacity-90",
				"disabled:cursor-not-allowed disabled:opacity-60",
			)}
			disabled={busy}
			type="submit"
		>
			{children}
		</button>
	);
}

/**
 * What went wrong, above the button rather than below it.
 *
 * Below the button it sits under the fold on a phone once the keyboard is up,
 * which is precisely when it is needed.
 */
export function FormError({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<p
			aria-live="polite"
			className="rounded-md border border-danger/40 bg-bg-page px-3.5 py-2.5 text-danger text-sm leading-normal"
		>
			{message}
		</p>
	);
}
