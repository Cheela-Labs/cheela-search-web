import type { Metadata } from "next";
import { SearchShell } from "@/components/search/search-shell";

type PageProps = {
	searchParams: Promise<{ q?: string | string[] }>;
};

function readQuery(params: { q?: string | string[] }): string {
	const raw = Array.isArray(params.q) ? params.q[0] : params.q;
	return raw?.trim() ?? "";
}

export async function generateMetadata({
	searchParams,
}: PageProps): Promise<Metadata> {
	const query = readQuery(await searchParams);
	if (!query) return {};

	return {
		title: query,
		// Result pages are not this site's content to offer an index — they are
		// generated per query, unbounded in number, and duplicative of the pages
		// they cite. Every search engine that has ever indexed another's result
		// pages has regretted it, and `robots.ts` blocks the same URLs at the
		// crawl layer so this is belt and braces rather than the only guard.
		robots: { index: false, follow: true },
		alternates: { canonical: "/" },
	};
}

export default async function Page({ searchParams }: PageProps) {
	return <SearchShell initialQuery={readQuery(await searchParams)} />;
}
