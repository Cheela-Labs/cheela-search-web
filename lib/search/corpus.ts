import type { AnswerBlock, Intent, Source } from "./types";

/**
 * The fixture corpus.
 *
 * `apps/search-api` and the crawler do not exist yet — Phase 0 of
 * `docs/capability-search-architecture.md` is unbuilt — so this is what the
 * route handler answers from. It is deliberately small and deliberately
 * honest: a query with no fixture returns a block saying so rather than a
 * fabricated answer over invented sources, because a search surface that
 * hallucinates convincingly during a demo is the one failure mode nobody
 * catches before it ships.
 *
 * When the real pipeline lands, this file is deleted and the route handler
 * proxies instead. Nothing in `components/` refers to it.
 */

type Fixture = {
	id: string;
	/** All must appear in the normalized query for the fixture to match. */
	match: string[][];
	display: string;
	intent: Intent;
	/** Candidate URLs the upstream index returned, before fetch and extract. */
	crawled: number;
	sources: Source[];
	blocks: AnswerBlock[];
};

const deployment: Fixture = {
	id: "deployment",
	// Two alternative keyword sets rather than one: the same question arrives
	// as "where should I deploy" and as "best host for a bursty API", and a
	// single AND-list matches neither reliably.
	match: [["deploy", "node"], ["bursty"], ["cold start"]],
	display: "Where should I deploy a Node.js API with bursty traffic?",
	intent: "informational",
	crawled: 18,
	sources: [
		{
			id: "cf-workers",
			n: 1,
			domain: "cloudflare.com",
			path: "cloudflare.com/workers/platform/limits",
			url: "https://developers.cloudflare.com/workers/platform/limits/",
			title: "Workers: execution model and pricing",
			swatch: "var(--color-orange-300)",
			capturedLabel: "Mar 2026",
			passages: [
				{
					id: "cf-workers-0",
					text: "…each request runs in a V8 isolate rather than a container, which removes the process-boot step entirely.",
					cited: false,
				},
				{
					id: "cf-workers-1",
					text: "Workers have no cold start; isolates are created in under 5ms and billed per request, with no charge for idle capacity.",
					cited: true,
				},
				{
					id: "cf-workers-2",
					text: "CPU time per invocation is capped; workloads exceeding the limit should be moved to a queue consumer or a container runtime.",
					cited: true,
				},
				{
					id: "cf-workers-3",
					text: "Concurrency is not provisioned and not reserved — a burst is absorbed by creating more isolates, which is why no scaling configuration is exposed.",
					cited: true,
				},
				{
					id: "cf-workers-4",
					text: "…the free plan includes 100,000 requests per day, after which usage is billed at $0.30 per million…",
					cited: false,
				},
			],
		},
		{
			id: "vercel-fns",
			n: 2,
			domain: "vercel.com",
			path: "vercel.com/docs/functions",
			url: "https://vercel.com/docs/functions",
			title: "Deploying Node.js functions",
			swatch: "var(--color-ink-3)",
			passages: [
				{
					id: "vercel-fns-0",
					text: "Functions scale to zero and start on demand. Node.js functions report a p95 cold start in the low hundreds of milliseconds for small bundles.",
					cited: true,
				},
				{
					id: "vercel-fns-1",
					text: "Bundle size is the dominant term in start latency — a function importing a large dependency tree pays for it on every cold invocation.",
					cited: true,
				},
				{
					id: "vercel-fns-2",
					text: "…fluid compute reuses a warm instance across concurrent invocations where the runtime permits it…",
					cited: false,
				},
			],
		},
		{
			id: "cf-nodejs",
			n: 3,
			domain: "developers.cloudflare.com",
			path: "developers.cloudflare.com/workers/runtime-apis/nodejs",
			url: "https://developers.cloudflare.com/workers/runtime-apis/nodejs/",
			title: "Runtime APIs and Node compatibility",
			swatch: "var(--color-orange-200)",
			passages: [
				{
					id: "cf-nodejs-0",
					text: "The Workers runtime is not Node.js. A compatibility layer implements a subset of Node's built-in modules, enabled per-worker with the nodejs_compat flag.",
					cited: true,
				},
				{
					id: "cf-nodejs-1",
					text: "Native addons cannot be loaded. A package with a compiled binding has no path onto this runtime and must be replaced or moved elsewhere.",
					cited: true,
				},
				{
					id: "cf-nodejs-2",
					text: "Raw TCP sockets are available only through the connect() API and only to permitted destinations; net and tls are not implemented.",
					cited: true,
				},
				{
					id: "cf-nodejs-3",
					text: "…long-running work should be handed to a Queue consumer, which is billed and limited separately…",
					cited: false,
				},
			],
		},
		{
			id: "aws-fargate",
			n: 4,
			domain: "aws.amazon.com",
			path: "aws.amazon.com/fargate/pricing",
			url: "https://aws.amazon.com/fargate/pricing/",
			title: "Fargate scaling and per-second billing",
			swatch: "var(--color-ink-4)",
			passages: [
				{
					id: "aws-fargate-0",
					text: "Fargate bills vCPU and memory per second, with a one-minute minimum per task, for the time a task is running.",
					cited: true,
				},
				{
					id: "aws-fargate-1",
					text: "Task startup is dominated by image pull and container init; a service scaling from zero should expect seconds, not milliseconds, before the first request is served.",
					cited: true,
				},
				{
					id: "aws-fargate-2",
					text: "…the runtime is a standard Linux container, so any Node.js version and any native dependency runs unchanged…",
					cited: false,
				},
			],
		},
		{
			id: "hn-migration",
			n: 5,
			domain: "news.ycombinator.com",
			path: "news.ycombinator.com/item",
			url: "https://news.ycombinator.com/",
			title: "Migrating an Express API to Workers",
			swatch: "var(--color-ink-6)",
			passages: [
				{
					id: "hn-migration-0",
					text: "The port took a fortnight. Routing and JSON handling were mechanical; what cost the time was a Postgres driver that assumed a TCP socket and an image pipeline that assumed sharp.",
					cited: true,
				},
				{
					id: "hn-migration-1",
					text: "…bill went from $340 to about $20, and the spike we sized the old cluster for now costs a few dollars for the hour it lasts…",
					cited: false,
				},
			],
		},
	],
	blocks: [
		{
			kind: "answer",
			id: "answer",
			spans: [
				{
					kind: "text",
					text: "Run it on Cloudflare Workers if the bursts are short and stateless",
				},
				{ kind: "cite", n: 1 },
				{
					kind: "text",
					text: " — otherwise Fargate on AWS with scale-to-zero",
				},
				{ kind: "cite", n: 4 },
				{ kind: "text", text: "." },
			],
		},
		{
			kind: "note",
			id: "why",
			label: "WHY",
			spans: [
				{
					kind: "text",
					text: "Bursty traffic punishes anything with a warm-instance floor. Workers have no cold start and bill per request",
				},
				{ kind: "cite", n: 1 },
				{ kind: "cite", n: 3 },
				{
					kind: "text",
					text: ", so a 20× spike costs 20× for ninety seconds instead of a month of provisioned headroom.",
				},
			],
		},
		{
			kind: "note",
			id: "tradeoff",
			label: "TRADEOFF",
			spans: [
				{
					kind: "text",
					text: "Workers cap CPU per request and run a non-Node runtime — native modules, long jobs and raw TCP won't port",
				},
				{ kind: "cite", n: 3 },
				{
					kind: "text",
					text: ". If any of those three is load-bearing, the migration is a rewrite and Fargate is the cheaper answer",
				},
				{ kind: "cite", n: 5 },
				{ kind: "text", text: "." },
			],
		},
		{
			kind: "comparison",
			id: "comparison",
			label: "COMPARISON · 3M REQUESTS/MO, 12× PEAK",
			columns: ["Workers", "Fargate", "Vercel"],
			rows: [
				{ label: "Monthly cost", cells: ["$14", "$61", "$38"] },
				{ label: "Cold start p95", cells: ["0 ms", "3.4 s", "280 ms"] },
				{ label: "Node compat", cells: ["Partial", "Full", "Full"] },
			],
		},
		{
			kind: "action",
			id: "next",
			label: "NEXT",
			prompt: "Want the cost model run against your actual traffic shape?",
			cta: "Calculate",
		},
	],
};

const orderTracking: Fixture = {
	id: "order-tracking",
	match: [["track", "order"], ["where", "package"], ["order status"]],
	display: "Track order 4471 on demo-shop.cheelalabs.com",
	// The one intent that may touch a third party, and the only fixture with a
	// capability attached.
	intent: "action",
	crawled: 6,
	sources: [
		{
			id: "demo-shop-orders",
			n: 1,
			domain: "demo-shop.cheelalabs.com",
			path: "demo-shop.cheelalabs.com/help/orders",
			url: "https://demo-shop.cheelalabs.com/",
			title: "Order status and delivery windows",
			swatch: "var(--color-orange-300)",
			capturedLabel: "Aug 2026",
			passages: [
				{
					id: "demo-shop-orders-0",
					text: "Order status is available from the account page, and through the storefront's agent-discovery manifest for automated clients.",
					cited: true,
				},
				{
					id: "demo-shop-orders-1",
					text: "Tracking numbers are issued at dispatch. An order that has not shipped reports a delivery window rather than a carrier reference.",
					cited: true,
				},
			],
		},
		{
			id: "demo-shop-manifest",
			n: 2,
			domain: "demo-shop.cheelalabs.com",
			path: "demo-shop.cheelalabs.com/.well-known/agent-discovery.json",
			url: "https://demo-shop.cheelalabs.com/.well-known/agent-discovery.json",
			title: "Agent discovery manifest",
			swatch: "var(--color-ink-3)",
			passages: [
				{
					id: "demo-shop-manifest-0",
					text: '"com.cheela.demoShop.lookupOrder" — returns status, delivery window and carrier reference for one order id. Declared read-only.',
					cited: true,
				},
				{
					id: "demo-shop-manifest-1",
					text: "…transport is the Cheela broker, and the domain is verified against the manifest's signing key…",
					cited: false,
				},
			],
		},
	],
	blocks: [
		{
			kind: "answer",
			id: "answer",
			spans: [
				{
					kind: "text",
					text: "This store publishes a manifest, so the order can be looked up directly rather than searched for",
				},
				{ kind: "cite", n: 2 },
				{ kind: "text", text: "." },
			],
		},
		{
			kind: "note",
			id: "why",
			label: "WHY",
			spans: [
				{
					kind: "text",
					text: "demo-shop.cheelalabs.com declares lookupOrder at /.well-known/agent-discovery.json, over a transport we speak, on a verified domain, at read effects tier",
				},
				{ kind: "cite", n: 2 },
				{
					kind: "text",
					text: ". That is the narrow set that may be called without asking first — everything else is described and linked, not invoked.",
				},
			],
		},
		{
			kind: "action",
			id: "invoke",
			label: "ACTION",
			prompt: "Look up order 4471 and return its status and delivery window.",
			cta: "Run lookup",
			capability: {
				domain: "demo-shop.cheelalabs.com",
				invocationName: "com.cheela.demoShop.lookupOrder",
				effects: "read",
				callable: true,
			},
		},
	],
};

const FIXTURES = [deployment, orderTracking];

/** The queries this corpus can answer, offered when one falls through. */
export const EXAMPLE_QUERIES = FIXTURES.map((f) => f.display);

function normalize(query: string): string {
	return query.toLowerCase().replace(/\s+/g, " ").trim();
}

export function matchFixture(query: string): Fixture | null {
	const q = normalize(query);
	if (!q) return null;
	for (const fixture of FIXTURES) {
		if (fixture.match.some((set) => set.every((term) => q.includes(term)))) {
			return fixture;
		}
	}
	return null;
}

/**
 * What an unmatched query gets.
 *
 * Says the index is empty rather than inventing sources. The stages still run
 * and still report honestly — nothing was crawled, nothing was read — so the
 * surface's own behaviour is exercised by every query, not only the seeded
 * ones.
 */
export function fallbackBlocks(query: string): AnswerBlock[] {
	return [
		{
			kind: "answer",
			id: "answer",
			spans: [
				{
					kind: "text",
					text: "Nothing is indexed for this query yet — the retrieval backend is not connected to this surface.",
				},
			],
		},
		{
			kind: "note",
			id: "why",
			label: "WHY",
			spans: [
				{
					kind: "text",
					text: `This is the query surface running against a fixture corpus. "${query.trim()}" is not in it, and answering anyway would mean composing over sources that do not exist. The two questions below are, and they exercise the full path — streamed sources, citations, evidence, and the action layer.`,
				},
			],
		},
		{
			kind: "suggestions",
			id: "suggestions",
			label: "TRY",
			queries: EXAMPLE_QUERIES,
		},
	];
}
