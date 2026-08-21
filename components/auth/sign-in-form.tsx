"use client";

import { type FormEvent, useEffect, useState } from "react";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import { ensureAuthInit } from "@/lib/auth/supertokens";
import { site } from "@/lib/site";
import { AuthCard, Field, FormError, SubmitButton } from "./auth-card";

/**
 * Sign in, as `07a Sign in` draws it.
 *
 * The call goes to the dashboard's auth API — see `lib/auth/supertokens.ts` for
 * why the session stays over there — and the cookie it sets is scoped to
 * `.cheelalabs.com`, so a session started here works on every surface.
 */

/**
 * Only relative, single-slash paths.
 *
 * `returnTo` arrives in a query string the visitor can edit and is fed straight
 * to a navigation, so an absolute URL here is an open redirect: a link to
 * `search.cheelalabs.com/sign-in?returnTo=https://evil.test` would sign someone
 * in and then hand them to a page that looks like ours. Copied from the
 * dashboard's own refresh route, which solves the identical problem.
 */
function safeReturnTo(value: string | null): string {
	if (!value?.startsWith("/")) return "/";
	if (value.startsWith("//") || value.includes("\\")) return "/";
	return value;
}

export function SignInForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [keepSignedIn, setKeepSignedIn] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(ensureAuthInit, []);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError(null);

		try {
			const response = await EmailPassword.signIn({
				formFields: [
					{ id: "email", value: email },
					{ id: "password", value: password },
				],
			});

			if (response.status === "OK") {
				const returnTo = safeReturnTo(
					new URLSearchParams(window.location.search).get("returnTo"),
				);
				// A full navigation rather than a router push: the account chip
				// reads the session from a route handler, and a client-side
				// transition would leave it showing the signed-out state until
				// something else happened to refetch.
				window.location.assign(returnTo);
				return;
			}

			if (response.status === "FIELD_ERROR") {
				setError(
					response.formFields[0]?.error ?? "Check the form and try again.",
				);
			} else if (response.status === "WRONG_CREDENTIALS_ERROR") {
				// Deliberately does not say which of the two was wrong. Saying
				// "no account with that email" turns this form into the account
				// oracle the backend closed off in `emailExistsGET`.
				setError("That email and password do not match an account.");
			} else {
				setError("Sign-in is not available for this account.");
			}
		} catch {
			setError("Could not reach the sign-in service. Try again in a moment.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<AuthCard
			footer={
				<>
					New here?{" "}
					<a
						className="border-border-strong border-b font-medium text-fg-primary"
						href="/sign-up"
					>
						Create an account
					</a>
				</>
			}
			title="Sign in to Cheela"
		>
			<form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
				<Field
					autoComplete="email"
					autoFocus
					id="email"
					label="EMAIL"
					onChange={setEmail}
					placeholder="you@example.com"
					type="email"
					value={email}
				/>
				<Field
					autoComplete="current-password"
					id="password"
					label="PASSWORD"
					onChange={setPassword}
					type="password"
					value={password}
				/>

				<div className="-mt-0.5 flex items-center justify-between gap-3">
					<label
						className="flex cursor-pointer items-center gap-2 text-fg-secondary text-sm"
						htmlFor="keep"
					>
						<input
							checked={keepSignedIn}
							className="h-[15px] w-[15px] cursor-pointer accent-accent"
							id="keep"
							name="keep"
							onChange={(event) => setKeepSignedIn(event.target.checked)}
							type="checkbox"
						/>
						Keep me signed in
					</label>
					{/*
					  Password reset lives on the dashboard, because the mail
					  SuperTokens sends builds its link from `websiteDomain` and that
					  is the dashboard. A reset form here would send people to a link
					  that lands there anyway.
					*/}
					<a
						className="text-fg-secondary text-sm hover:text-fg-primary"
						href={`${site.dashboard}/sign-in/reset-password`}
						rel="noreferrer"
					>
						Forgot password?
					</a>
				</div>

				<FormError message={error} />
				<SubmitButton busy={busy}>
					{busy ? "Signing in…" : "Sign in"}
				</SubmitButton>
			</form>
		</AuthCard>
	);
}
