import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ORGANIZATION_ID, site, siteUrl } from "@/lib/site";

const ranade = localFont({
	src: "./fonts/Ranade-Variable.ttf",
	variable: "--font-ranade",
	weight: "100 900",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	variable: "--font-jetbrains-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	// Pinned, not derived from the deployment: canonicals describe identity,
	// and a preview hostname leaking in here rewrites the canonical of every
	// page on the site.
	metadataBase: new URL(site.search),
	title: {
		default: "Cheela Search",
		template: "%s — Cheela Search",
	},
	description:
		"Search that cites what it read, and acts where a site says it can. One bar, a cited answer, and the passages behind every claim.",
	alternates: { canonical: "/" },
	openGraph: {
		siteName: "Cheela Search",
		type: "website",
		locale: "en_US",
	},
	twitter: { card: "summary_large_image" },
	icons: {
		icon: "/favicon.ico",
		apple: "/apple-touch-icon.png",
	},
};

export const viewport: Viewport = {
	themeColor: "#fafaf8",
	// The composer is pinned to the bottom of `100dvh`; without this the mobile
	// URL bar sits on top of it.
	viewportFit: "cover",
};

/**
 * `SearchAction` is not decoration here — it declares the query endpoint this
 * site actually exposes, which is the one piece of structured data a search
 * surface is genuinely entitled to publish. The organization is referenced by
 * its id on `www` rather than minted again, so the five Cheela hosts describe
 * one entity instead of five.
 */
const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			"@id": `${siteUrl("/")}#website`,
			url: siteUrl("/"),
			name: "Cheela Search",
			publisher: { "@id": ORGANIZATION_ID },
			potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: `${siteUrl("/")}?q={search_term_string}`,
				},
				"query-input": "required name=search_term_string",
			},
		},
	],
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${ranade.variable} ${jetbrainsMono.variable} bg-bg-page font-body text-fg-primary antialiased`}
			>
				{children}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined
					dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
					type="application/ld+json"
				/>
			</body>
		</html>
	);
}
