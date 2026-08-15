import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Who is signed in, read from the shared session cookie.
 *
 * ## Why this verifies a token instead of using supertokens-node
 *
 * The dashboard hosts the auth API and owns the session. This surface only
 * needs to answer "who is this", and a SuperTokens access token is a JWT signed
 * by the core — so the answer is a signature check against a public key set,
 * not a session library.
 *
 * That matters here more than it would elsewhere: this app's dependencies are
 * `next` and `react`, and `supertokens-node` is 2.2 MB of code for a question
 * `jose` answers in one call. It would also make this app a second
 * *participant* in session lifecycle — issuing, refreshing, revoking — when it
 * has no business doing any of those. Reading is the whole contract.
 *
 * ## What it deliberately cannot do
 *
 * It cannot refresh. An expired access token reads as signed out, and the chip
 * links to the dashboard, which refreshes and sends the visitor back. Putting
 * refresh here would mean this surface writing session cookies for a session it
 * does not own — two writers again, which is the shape that produced the
 * `users` table's odd key.
 */

/** SuperTokens' access-token cookie. */
const COOKIE = "sAccessToken";

/**
 * The dashboard's public key set.
 *
 * Served by the backend SDK, not by the core, so this needs no core credential
 * — which is the point. `createRemoteJWKSet` caches and refetches on an unknown
 * `kid`, so a key rotation costs one extra request rather than an outage.
 */
const JWKS_URL = new URL(
	`${process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? "https://dashboard.cheelalabs.com"}/api/auth/jwt/jwks.json`,
);

const jwks = createRemoteJWKSet(JWKS_URL);

export type SessionUser = {
	userId: string;
	email: string | null;
	/** Whether the address has been proven. SuperTokens' `st-ev` claim. */
	emailVerified: boolean;
};

/**
 * Verifies the cookie and returns the user, or null.
 *
 * Null for every failure — absent, malformed, expired, wrongly signed. The
 * distinctions matter to the dashboard, which can act on them; here they all
 * mean the same thing, which is that we cannot name this visitor.
 */
export async function readSession(
	cookieHeader: string | null,
): Promise<SessionUser | null> {
	const token = tokenFrom(cookieHeader);
	if (!token) return null;

	try {
		const { payload } = await jwtVerify(token, jwks);

		const userId = typeof payload.sub === "string" ? payload.sub : null;
		if (!userId) return null;

		// `st-ev` is EmailVerification's claim, shaped `{ v: boolean, t: number }`.
		// Read defensively: a claim that changes shape should log somebody out,
		// never throw on a page render.
		const claim = payload["st-ev"];
		const verified =
			typeof claim === "object" && claim !== null && "v" in claim
				? Boolean((claim as { v: unknown }).v)
				: false;

		return {
			userId,
			email: typeof payload.email === "string" ? payload.email : null,
			emailVerified: verified,
		};
	} catch {
		return null;
	}
}

/**
 * Pulls one cookie out of a `Cookie` header.
 *
 * Hand-parsed rather than pulling in a cookie library for a single lookup, and
 * split on the *first* `=` only — a JWT is base64url and can legitimately
 * contain `=` padding, so splitting on every occurrence truncates the token and
 * produces a signature failure that looks like a key problem.
 */
function tokenFrom(header: string | null): string | null {
	if (!header) return null;

	for (const part of header.split(";")) {
		const trimmed = part.trim();
		const eq = trimmed.indexOf("=");
		if (eq === -1) continue;
		if (trimmed.slice(0, eq) !== COOKIE) continue;

		const value = trimmed.slice(eq + 1).trim();
		return value.length > 0 ? decodeURIComponent(value) : null;
	}
	return null;
}

/** "ada@example.com" → "A". Two letters when the address gives two words. */
export function initialsFor(email: string | null): string {
	if (!email) return "";
	const local = email.split("@")[0] ?? "";
	const words = local.split(/[._-]+/).filter(Boolean);
	if (words.length === 0) return "";
	if (words.length === 1) return (words[0][0] ?? "").toUpperCase();
	return ((words[0][0] ?? "") + (words[1][0] ?? "")).toUpperCase();
}
