export const site = {
	/**
	 * The canonical search origin, pinned rather than derived from the
	 * environment — canonicals describe identity, which does not vary per
	 * deployment. A preview hostname leaking in here rewrites the canonical of
	 * the whole site, which is how the marketing site's tags were once wrong.
	 */
	search: "https://search.cheelalabs.com",
	website: "https://www.cheelalabs.com",
	docs: "https://docs.cheelalabs.com",
	blog: "https://blogs.cheelalabs.com",
	demos: "https://demos.cheelalabs.com",
	dashboard: "https://dashboard.cheelalabs.com",
	console: "https://console.cheelalabs.com",
	github: "https://github.com/Cheela-Labs/platform",
	x: "https://x.com/CheelaLabs",
} as const;

/** Absolute URL on the canonical search host. */
export function siteUrl(pathname = "/"): string {
	return new URL(pathname, site.search).toString();
}

/**
 * The organization's canonical node id, on `www` — not on this host.
 *
 * There is one Cheela Labs and now five sites describing it. Minting
 * `…search.cheelalabs.com/#organization` here would be a sixth identifier for
 * one entity that a crawler has to infer is the same. Must stay
 * byte-identical to what `apps/website/lib/seo.ts` produces for
 * `nodeId("organization")`.
 */
export const ORGANIZATION_ID = `${site.website}/#organization`;
