import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

/**
 * `noindex`, and it has to be stated rather than assumed.
 *
 * `robots.ts` allows this host — it is a public search engine — so unlike the
 * dashboard, nothing else keeps this page out of an index. A sign-in form in
 * search results is a phishing target wearing our domain.
 */
export const metadata: Metadata = {
	title: "Sign in",
	robots: { index: false, follow: false },
};

export default function SignInPage() {
	return <SignInForm />;
}
