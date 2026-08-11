"use client";

import {
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { cn } from "@/lib/cn";
import { useSpeechInput } from "@/lib/use-speech-input";
import { ArrowUpIcon, MicIcon } from "./icons";

/**
 * The bar. There is only ever one of these on screen.
 *
 * `hero` is the start state — centred, the only thing on the page. `docked` is
 * the same control after it has dropped to the bottom, and the transition
 * between them is a remount at a different place in the layout rather than an
 * animated move: the two live in different flex containers, and animating a
 * position change between containers costs more than it buys on a control the
 * user is about to type into.
 */

const MAX_ROWS_HEIGHT = 132;

type ComposerProps = {
	variant: "hero" | "docked";
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	/** A search is streaming. The send affordance goes quiet rather than away. */
	busy?: boolean;
	placeholder: string;
	autoFocus?: boolean;
};

export function Composer({
	variant,
	value,
	onChange,
	onSubmit,
	busy = false,
	placeholder,
	autoFocus = false,
}: ComposerProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const { supported, listening, toggle } = useSpeechInput(
		useCallback(
			(transcript: string) => {
				onChange(value ? `${value} ${transcript}` : transcript);
				textareaRef.current?.focus();
			},
			[onChange, value],
		),
	);

	// Grows with the query and stops; a bar that keeps growing eats the answer
	// it is supposed to be asking about.
	//
	// Focus is taken here rather than with the `autoFocus` attribute. On the
	// start screen this control is the entire page, so focusing it is right —
	// but the attribute fires before hydration and scrolls the element into
	// view, and `.focus()` after mount does the same job without either.
	useEffect(() => {
		const node = textareaRef.current;
		if (!node) return;
		node.style.height = "auto";
		node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_HEIGHT)}px`;
		if (autoFocus) node.focus();
	}, [autoFocus]);

	const resize = (node: HTMLTextAreaElement) => {
		node.style.height = "auto";
		node.style.height = `${Math.min(node.scrollHeight, MAX_ROWS_HEIGHT)}px`;
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const trimmed = value.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter sends, Shift+Enter breaks the line. IME composition must not
		// submit — pressing Enter to accept a candidate would otherwise fire the
		// search with a half-typed query.
		if (
			event.key !== "Enter" ||
			event.shiftKey ||
			event.nativeEvent.isComposing
		) {
			return;
		}
		event.preventDefault();
		const trimmed = value.trim();
		if (trimmed) onSubmit(trimmed);
	};

	const hero = variant === "hero";
	const canSend = value.trim().length > 0;

	return (
		<form
			className={cn(
				"flex w-full items-end gap-3 rounded-lg bg-bg-surface px-4 py-3.5 transition-[border-color,box-shadow] duration-base ease-standard sm:gap-3.5 sm:px-5",
				hero ? "sm:py-[18px]" : "sm:py-4",
				busy && !hero
					? "border border-border-default"
					: "border border-border-strong shadow-sm",
				"focus-within:border-fg-tertiary",
			)}
			onSubmit={submit}
		>
			<label className="sr-only" htmlFor="composer-input">
				Search query
			</label>
			<textarea
				className={cn(
					"max-h-[132px] min-w-0 flex-1 resize-none self-center bg-transparent text-fg-primary leading-normal outline-none placeholder:text-fg-tertiary",
					hero ? "text-base sm:text-md" : "text-base sm:text-md",
				)}
				id="composer-input"
				onChange={(event) => {
					onChange(event.target.value);
					resize(event.target);
				}}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				ref={textareaRef}
				rows={1}
				spellCheck={false}
				value={value}
			/>

			{supported ? (
				<button
					aria-label={listening ? "Stop dictation" : "Dictate your query"}
					aria-pressed={listening}
					className={cn(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-fast ease-out",
						listening
							? "bg-accent-soft text-accent-strong"
							: "text-fg-tertiary hover:bg-bg-sunken hover:text-fg-secondary",
					)}
					onClick={toggle}
					type="button"
				>
					<MicIcon />
				</button>
			) : null}

			<button
				aria-label="Search"
				className={cn(
					"flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md transition-[background-color,transform] duration-fast ease-out active:scale-95",
					canSend
						? "bg-ink-0 text-paper-0 hover:bg-ink-2"
						: "bg-bg-sunken text-fg-tertiary",
				)}
				disabled={!canSend}
				type="submit"
			>
				<ArrowUpIcon />
			</button>
		</form>
	);
}
