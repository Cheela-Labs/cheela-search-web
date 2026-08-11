import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * `hero` is the start screen's lockup; `mark` is the session header's, where
 * the wordmark would compete with the answer for the same attention.
 */
export function Brand({ variant }: { variant: "hero" | "mark" }) {
	if (variant === "mark") {
		return (
			<Link
				aria-label="Cheela Search — new search"
				className="inline-flex shrink-0 rounded-sm"
				href="/"
			>
				<Image
					alt=""
					className="h-5 w-5 object-contain"
					height={20}
					priority
					src="/logo-mark.svg"
					width={20}
				/>
			</Link>
		);
	}

	return (
		<div className="flex items-center gap-2.5 sm:gap-3">
			<Image
				alt=""
				className={cn("h-7 w-7 object-contain sm:h-[34px] sm:w-[34px]")}
				height={34}
				priority
				src="/logo-mark.svg"
				width={34}
			/>
			<span className="font-bold text-xl tracking-tight sm:text-2xl">
				Cheela
			</span>
		</div>
	);
}
