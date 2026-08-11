import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

/**
 * Matches the design system's Button, at the one size this surface asks for
 * (`sm`, 32px tall). Kept local rather than shared with `apps/website` for the
 * same reason `globals.css` is a copy: every app here builds standalone from
 * its own mirror, where a workspace dependency cannot resolve.
 */
const variantClasses: Record<Variant, string> = {
	primary: "bg-accent text-fg-on-accent hover:bg-accent-strong",
	secondary:
		"border border-border-strong bg-bg-surface text-fg-primary hover:bg-bg-sunken",
	ghost: "text-fg-secondary hover:bg-bg-sunken hover:text-fg-primary",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	children: ReactNode;
	variant?: Variant;
};

export function Button({
	children,
	variant = "primary",
	className,
	type = "button",
	...rest
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 font-body font-medium text-sm transition-[background-color,transform] duration-fast ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
				variantClasses[variant],
				className,
			)}
			type={type === "submit" ? "submit" : "button"}
			{...rest}
		>
			{children}
		</button>
	);
}
