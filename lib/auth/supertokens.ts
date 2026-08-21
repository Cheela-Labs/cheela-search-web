import SuperTokens from "supertokens-web-js";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import Session from "supertokens-web-js/recipe/session";
import { site } from "@/lib/site";

/**
 * The auth client, pointed at the dashboard.
 *
 * ## Why the API stays over there
 *
 * The dashboard owns the session. It runs the SuperTokens backend, it issues
 * the cookie, and that cookie is scoped to `.cheelalabs.com` so every surface
 * on the domain already reads it — which is exactly what `lib/auth/session.ts`
 * does here, with `jose` and no session library at all.
 *
 * These pages change where the *form* lives, not where the session comes from.
 * `apiDomain` is the dashboard, so a sign-in typed on `search.cheelalabs.com`
 * is still a call to `dashboard.cheelalabs.com/api/auth`, still creates the one
 * session, and still leaves the dashboard the only writer. Hosting a second
 * auth backend here would have made this surface a second participant in
 * session lifecycle — issuing, refreshing, revoking — which the comment in
 * `session.ts` argues against at length and which is the shape that produced
 * the `users` table's odd key.
 *
 * The cost is CORS: the dashboard's auth route now allows this origin
 * explicitly. One entry, credentials on, and nothing else widened.
 *
 * ## What is deliberately not here
 *
 * No `ThirdParty`. The dashboard keeps Google and GitHub and anyone who signed
 * up that way still signs in there — this surface offers the two fields the
 * design draws and no more. And no `EmailVerification` recipe: verification is
 * `REQUIRED` on the backend, but the link in the mail points at the dashboard,
 * so completing it is that app's job.
 */

let initialised = false;

export function ensureAuthInit(): void {
	if (initialised) return;
	initialised = true;

	SuperTokens.init({
		appInfo: {
			appName: "Cheela",
			// The dashboard's origin, not this one. See above.
			apiDomain: process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? site.dashboard,
			apiBasePath: "/api/auth",
		},
		recipeList: [Session.init(), EmailPassword.init()],
	});
}

export { EmailPassword, Session };
