"use client";

import { type FormEvent, useEffect, useState } from "react";
import EmailPassword from "supertokens-web-js/recipe/emailpassword";
import { ensureAuthInit } from "@/lib/auth/supertokens";
import { site } from "@/lib/site";
import { AuthCard, Field, FormError, SubmitButton } from "./auth-card";

/**
 * Create an account, as `07b Create account` draws it — name, email, password.
 *
 * ## Sign-up does not end at sign-up
 *
 * `EmailVerification` is `REQUIRED` on the backend, and the comment there says
 * why in terms that matter more than a tidy flow: a free account carries 100
 * executions an hour against Cheela's own OpenRouter credential, so an
 * unverified signup is metered spend against an identity nobody owns.
 *
 * SuperTokens therefore creates the account and a session, and refuses to treat
 * that session as usable until the address is proven. Redirecting to the search
 * page on success would land somebody on a surface that reads them as signed
 * out, with no explanation. So this ends on a state of its own that says what
 * happened and what to do — which the design does not draw, because a static
 * frame has no second step.
 */
export function SignUpForm() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);

	useEffect(ensureAuthInit, []);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError(null);

		try {
			const response = await EmailPassword.signUp({
				formFields: [
					{ id: "email", value: email },
					{ id: "password", value: password },
					// Accepted because the backend declares it. An undeclared field
					// is rejected by SuperTokens' own validation, which is why this
					// needed a change over there rather than only here.
					{ id: "name", value: name.trim() },
				],
			});

			if (response.status === "OK") {
				setSent(true);
				return;
			}

			if (response.status === "FIELD_ERROR") {
				setError(
					response.formFields[0]?.error ?? "Check the form and try again.",
				);
			} else {
				setError("Sign-up is not available right now.");
			}
		} catch {
			setError("Could not reach the sign-up service. Try again in a moment.");
		} finally {
			setBusy(false);
		}
	}

	if (sent) {
		return (
			<AuthCard
				footer={
					<a
						className="border-border-strong border-b font-medium text-fg-primary"
						href="/sign-in"
					>
						Back to sign in
					</a>
				}
				title="Check your email"
			>
				<p className="text-pretty text-base text-ink-2 leading-relaxed">
					We sent a link to <span className="font-mono">{email}</span>. Open it
					to finish setting up your account — a Cheela account can spend
					credits, so the address has to be proven before it can.
				</p>
				<p className="text-fg-secondary text-sm leading-relaxed">
					The link opens on{" "}
					<a
						className="border-border-strong border-b"
						href={site.dashboard}
						rel="noreferrer"
					>
						dashboard.cheelalabs.com
					</a>
					, which is where your account settings live.
				</p>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			footer={
				<>
					Already have one?{" "}
					<a
						className="border-border-strong border-b font-medium text-fg-primary"
						href="/sign-in"
					>
						Sign in
					</a>
				</>
			}
			title="Create your account"
		>
			<form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
				<Field
					autoComplete="name"
					autoFocus
					id="name"
					label="NAME"
					onChange={setName}
					placeholder="Ada Kwan"
					type="text"
					value={name}
				/>
				<Field
					autoComplete="email"
					id="email"
					label="EMAIL"
					onChange={setEmail}
					placeholder="you@example.com"
					type="email"
					value={email}
				/>
				<Field
					autoComplete="new-password"
					id="password"
					label="PASSWORD"
					onChange={setPassword}
					type="password"
					value={password}
				/>

				<FormError message={error} />
				<SubmitButton busy={busy}>
					{busy ? "Creating account…" : "Create account"}
				</SubmitButton>
			</form>
		</AuthCard>
	);
}
