import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			// Result pages are generated per query and unbounded in number; the
			// crawl budget spent enumerating them buys nothing and the pages they
			// cite are the ones worth indexing. `/api/` is the event stream, which
			// no crawler can do anything with.
			disallow: ["/?q=", "/api/"],
		},
		sitemap: new URL("/sitemap.xml", site.search).toString(),
	};
}
