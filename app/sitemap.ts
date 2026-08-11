import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * One entry. The site is one page — everything else is a query string, and
 * `robots.ts` asks crawlers not to enumerate those.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: siteUrl("/"),
			changeFrequency: "weekly",
			priority: 1,
		},
	];
}
