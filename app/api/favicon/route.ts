import {
	isWellFormedHostname,
	resolvesToPublicAddress,
} from "@/lib/net/public-host";

/**
 * A site's own favicon, fetched by us and served same-origin.
 *
 * The rail wants a real icon per result. The obvious way to get one is to
 * point an `<img>` at a third-party favicon service, and that is the thing
 * this route exists to avoid: it would tell that service every domain in every
 * result set, for every reader, which is a complete log of what people search
 * for here assembled by somebody else. Proxying costs a route and a cache and
 * keeps the browser talking only to us.
 *
 * A miss is normal, not exceptional. Around a fifth of sites answer
 * `/favicon.ico` with an HTML page — a single-page app's catch-all route will
 * happily return 200 and 270KB of markup — and some answer 403 to anything
 * that is not a browser. The caller falls back to the domain swatch, which is
 * what the rail drew before this existed.
 */

export const dynamic = "force-dynamic";

/** Enough for the icon fetch, the homepage read, and one declared-icon fetch. */
export const maxDuration = 15;

/** Icons are small. Anything larger is not an icon, whatever it claims. */
const MAX_ICON_BYTES = 256 * 1024;

/** Enough of a homepage to reach `<head>`, without reading a whole SPA bundle. */
const MAX_HTML_BYTES = 512 * 1024;

const FETCH_TIMEOUT_MS = 4000;

/**
 * A day in the browser, a month at the edge.
 *
 * Favicons change roughly never, and the expensive part is the miss path — two
 * requests to a site that turns out not to have one. `stale-while-revalidate`
 * means a reader never waits for that; the edge serves the last answer and
 * refreshes behind them.
 */
const HIT_CACHE =
	"public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";

/**
 * Misses are cached too, and deliberately.
 *
 * Without this, every result from a site with no favicon re-runs the full miss
 * path on every search that returns it — and the sites that miss are the ones
 * that are slowest to say so.
 */
const MISS_CACHE = "public, max-age=3600, s-maxage=86400";

function miss(): Response {
	// Flat 404 with no detail. Which of "bad hostname", "private address",
	// "connection refused" and "not an image" occurred is exactly the signal a
	// network scan through this route would be reading.
	return new Response(null, {
		status: 404,
		headers: { "cache-control": MISS_CACHE },
	});
}

/** Reads a response body up to `limit`, refusing rather than truncating. */
async function readCapped(
	response: Response,
	limit: number,
	// `Uint8Array<ArrayBuffer>`, not the default `Uint8Array<ArrayBufferLike>`:
	// `BodyInit` will not take a view that might be over a SharedArrayBuffer,
	// and the wider annotation is what makes it look like it might be.
): Promise<Uint8Array<ArrayBuffer> | null> {
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > limit) return null;

	const chunks: Uint8Array[] = [];
	let total = 0;
	const reader = response.body?.getReader();
	if (!reader) return null;

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		// A truncated icon is a corrupt icon; a truncated page can lose the
		// `<link>` we came for. Neither is worth returning, so this cancels.
		if (total > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}

	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

async function get(url: string): Promise<Response | null> {
	try {
		const response = await fetch(url, {
			redirect: "follow",
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				// Named honestly. A site that would rather not be fetched by a
				// bot can say so about a name it can actually identify.
				"user-agent":
					"CheelaSearchBot/1.0 (+https://search.cheelalabs.com/bot)",
				accept:
					"image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.5",
			},
		});
		return response.ok ? response : null;
	} catch {
		return null;
	}
}

/** The response, if it is genuinely an image and small enough to be an icon. */
async function asIcon(response: Response | null): Promise<Response | null> {
	if (!response) return null;

	const type = (response.headers.get("content-type") ?? "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	// The check that catches the single-page apps: `/favicon.ico` returning 200
	// and `text/html` is the most common non-answer on the web.
	if (!type.startsWith("image/")) return null;
	// SVG is an image that can carry script. It is same-origin here, so a
	// hostile one would run as us — and no favicon is worth that.
	if (type === "image/svg+xml") return null;

	const body = await readCapped(response, MAX_ICON_BYTES);
	if (!body || body.byteLength === 0) return null;

	return new Response(body, {
		headers: {
			"content-type": type,
			"cache-control": HIT_CACHE,
			"content-security-policy": "default-src 'none'; sandbox",
			"x-content-type-options": "nosniff",
		},
	});
}

/**
 * The icon a page declares in its `<head>`, when `/favicon.ico` was not one.
 *
 * Regex rather than a parser, because the target is one attribute on one tag
 * near the top of the document and a real parser is a dependency and a DOM for
 * 512KB of markup we are about to discard.
 */
function declaredIconHref(html: string, origin: string): string | null {
	const links = html.slice(0, MAX_HTML_BYTES).match(/<link\b[^>]*>/gi);
	if (!links) return null;

	for (const tag of links) {
		const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase();
		// `mask-icon` is excluded: it is always an SVG, which asIcon rejects.
		if (!rel || !/\b(icon|shortcut icon|apple-touch-icon)\b/.test(rel)) {
			continue;
		}
		const href = /\bhref\s*=\s*["']([^"']+)/i.exec(tag)?.[1];
		if (!href) continue;

		try {
			const resolved = new URL(href, origin);
			if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
				continue;
			}
			return resolved.toString();
		} catch {
			// A relative href against a base we built ourselves should not throw,
			// but a `href="{{ ... }}"` from an unrendered template will.
		}
	}
	return null;
}

export async function GET(request: Request): Promise<Response> {
	const domain = (new URL(request.url).searchParams.get("domain") ?? "")
		.trim()
		.toLowerCase();

	if (!isWellFormedHostname(domain)) return miss();
	if (!(await resolvesToPublicAddress(domain))) return miss();

	const origin = `https://${domain}`;

	const direct = await asIcon(await get(`${origin}/favicon.ico`));
	if (direct) return direct;

	// Second chance: read what the page says its icon is. This is what recovers
	// every site whose `/favicon.ico` is really a client-side router.
	const page = await get(origin);
	if (!page) return miss();

	const html = await readCapped(page, MAX_HTML_BYTES);
	if (!html) return miss();

	const href = declaredIconHref(new TextDecoder().decode(html), origin);
	if (!href) return miss();

	// Re-validated, because an absolute href in someone else's HTML is someone
	// else's URL — the whole SSRF check would be pointless if this one skipped it.
	const target = new URL(href);
	if (!(await resolvesToPublicAddress(target.hostname))) return miss();

	return (await asIcon(await get(target.toString()))) ?? miss();
}
