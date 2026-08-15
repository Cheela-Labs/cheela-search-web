import { initialsFor, readSession } from "@/lib/auth/session";

/**
 * Who is signed in, for the account chip.
 *
 * A route handler rather than a server component, because the chip lives inside
 * `search-shell.tsx`, which is a client component — and because the alternative
 * would make every page dynamic. This surface is 4-of-6 prerendered and the
 * search box should render from cache; one small fetch after hydration is a
 * better trade than server-rendering the whole page to decide which avatar to
 * draw.
 *
 * Nothing here is secret. The visitor's own email, returned to the visitor's
 * own browser, from a cookie the browser already holds.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const user = await readSession(request.headers.get("cookie"));

	if (!user) {
		return Response.json(
			{ signedIn: false },
			// Never cached, at any layer. A cached "signed in as Ada" served to
			// the next visitor is the worst bug this endpoint could have, and a
			// shared cache in front of it is exactly how that happens.
			{ headers: { "cache-control": "no-store, private" } },
		);
	}

	return Response.json(
		{
			signedIn: true,
			email: user.email,
			initials: initialsFor(user.email),
			emailVerified: user.emailVerified,
		},
		{ headers: { "cache-control": "no-store, private" } },
	);
}
