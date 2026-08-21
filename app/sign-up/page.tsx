import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

/** Same reasoning as `/sign-in`: this host is indexed, and this page must not be. */
export const metadata: Metadata = {
	title: "Create your account",
	robots: { index: false, follow: false },
};

export default function SignUpPage() {
	return <SignUpForm />;
}
