import { lookup } from "node:dns/promises";

/**
 * Whether a hostname resolves somewhere on the public internet.
 *
 * This exists because `/api/favicon` fetches a URL derived from a search
 * result, and a search result's domain is not ours. Without this the route is
 * a server-side request forgery gadget: anyone able to get a string into a
 * result — or simply able to call the route directly, since it is a public GET
 * — could point it at `169.254.169.254` and read a cloud metadata endpoint, or
 * sweep an internal network by timing the responses.
 *
 * `apps/search-api` has a far more thorough version of this in
 * `infra/egress`, with robots handling, byte caps and redirect policy. It is
 * not importable here: each app builds standalone from its own subtree mirror,
 * where a `workspace:` dependency cannot resolve. So this is deliberately the
 * narrow subset a favicon fetch needs, rather than a second general egress
 * client that would drift from the real one.
 */

/** Lowercase, dotted, no port, no userinfo, no trailing dot, no wildcards. */
const HOSTNAME =
	/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function isWellFormedHostname(host: string): boolean {
	return host.length <= 253 && HOSTNAME.test(host);
}

/**
 * IPv4 ranges that are not the public internet, as [network, prefix length].
 *
 * Loopback and the RFC1918 blocks are the obvious ones. The rest are the ones
 * that get forgotten and then turn up in an incident report: 169.254.169.254 is
 * the cloud metadata endpoint on every major provider, 100.64/10 is carrier
 * NAT and is where a lot of internal infrastructure actually lives, and 0/8
 * resolves to "this host" on Linux — `http://0.0.0.0:8080/` reaches localhost.
 */
const IPV4_BLOCKS: [string, number][] = [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.88.99.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
];

function toInt(address: string): number | null {
	const parts = address.split(".");
	if (parts.length !== 4) return null;
	let value = 0;
	for (const part of parts) {
		if (!/^\d{1,3}$/.test(part)) return null;
		const octet = Number(part);
		if (octet > 255) return null;
		value = value * 256 + octet;
	}
	return value;
}

function isPublicIpv4(address: string): boolean {
	const value = toInt(address);
	if (value === null) return false;
	for (const [network, bits] of IPV4_BLOCKS) {
		const base = toInt(network);
		if (base === null) continue;
		// `>>> 0` because a /0-style shift on a 32-bit signed int would sign-
		// extend; every mask here has to stay unsigned to compare correctly.
		const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
		if ((value & mask) >>> 0 === base) return false;
	}
	return true;
}

function isPublicIpv6(address: string): boolean {
	const normalized = address.toLowerCase().split("%")[0];

	// An IPv4-mapped or NAT64 address is an IPv4 address wearing a hat, and
	// checking it as IPv6 would let ::ffff:127.0.0.1 through as "public".
	const embedded = /(?:^::ffff:|^64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(
		normalized,
	);
	if (embedded) return isPublicIpv4(embedded[1]);

	if (normalized === "::" || normalized === "::1") return false;
	// Unique-local (fc00::/7), link-local (fe80::/10), multicast (ff00::/8),
	// and the documentation range.
	if (/^f[cd]/.test(normalized)) return false;
	if (/^fe[89ab]/.test(normalized)) return false;
	if (/^ff/.test(normalized)) return false;
	if (normalized.startsWith("2001:db8")) return false;
	return true;
}

/**
 * Resolves a hostname and reports whether *every* address it answers with is
 * public.
 *
 * Every, not any: a name that returns one public and one private address is a
 * name that will reach the private one on some fraction of requests, which is
 * precisely how a DNS-rebinding attack is built.
 *
 * The honest limitation: `fetch` resolves the name again itself, so a record
 * whose TTL expires between this check and that one can point somewhere else.
 * Closing that needs connecting by validated IP with SNI and a Host header,
 * which `fetch` will not do. What bounds the damage here instead is what the
 * route does with the response — it returns bytes only when the content type
 * is an image and the body is under a cap, and never returns headers, status
 * detail or timing beyond a flat 404.
 */
export async function resolvesToPublicAddress(host: string): Promise<boolean> {
	if (!isWellFormedHostname(host)) return false;
	try {
		const addresses = await lookup(host, { all: true });
		if (addresses.length === 0) return false;
		return addresses.every(({ address, family }) =>
			family === 6 ? isPublicIpv6(address) : isPublicIpv4(address),
		);
	} catch {
		// NXDOMAIN, SERVFAIL, or a resolver that is down. None of them are a
		// reason to fetch anything.
		return false;
	}
}
