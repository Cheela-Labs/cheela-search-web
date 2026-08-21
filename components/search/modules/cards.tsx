import { cn } from "@/lib/cn";
import type { ResultModule } from "@/lib/search/modules";
import { dayParts } from "@/lib/search/structured";
import {
	AccentChip,
	Band,
	CodeSlab,
	Eyebrow,
	FactTable,
	ModuleCard,
	Pills,
	Provenance,
	RemoteImage,
	Row,
	Rows,
} from "./frame";

/**
 * The fifteen result modules, in the one visual idiom the design uses.
 *
 * Each takes data a reader in `lib/search/modules` has already decided is worth
 * rendering. None of them decides anything: a card here never checks whether a
 * field is good enough to show, because the reader has already returned `null`
 * if it was not. That split is what keeps "would this be honest" in one place
 * and testable, and stops fifteen components each inventing their own answer.
 *
 * Every one ends in a `Provenance` strip naming where its data came from. That
 * is the design's own convention on all twenty artboards and it is not
 * decoration — everything above it is a publisher's claim about their own page.
 */

type Card<K extends ResultModule["kind"]> = {
	module: Extract<ResultModule, { kind: K }>;
};

/* -- Knowledge ------------------------------------------------------------ */

export function EntityCard({ module }: Card<"entity">) {
	return (
		<ModuleCard>
			<Band>
				<Eyebrow>{module.label}</Eyebrow>
				<div className="mt-1.5 flex items-center gap-2.5">
					{module.favicon ? (
						<span className="h-6 w-6 shrink-0 overflow-hidden rounded-[5px] bg-bg-sunken">
							<RemoteImage fit="contain" src={module.favicon} />
						</span>
					) : null}
					<h3 className="font-bold text-lg leading-tight tracking-tight sm:text-xl">
						{module.name}
					</h3>
				</div>
				<p className="mt-2 max-w-[52ch] text-pretty text-ink-2 text-md leading-snug">
					{module.description}
				</p>
			</Band>
			{module.facts.length > 0 ? (
				<Band divide>
					<FactTable facts={module.facts} />
				</Band>
			) : null}
			{module.url ? (
				<Row href={module.url}>
					<span className="flex items-center justify-between gap-3">
						<span className="truncate font-mono text-2xs text-fg-tertiary">
							{module.url.replace(/^https?:\/\//, "")}
						</span>
						<span className="shrink-0 text-fg-secondary">Open ↗</span>
					</span>
				</Row>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function DocsCard({ module }: Card<"docs">) {
	return (
		<ModuleCard>
			<Band className="flex items-center gap-2 border-border-default border-b">
				<Eyebrow>CANONICAL</Eyebrow>
				<span className="truncate font-mono text-2xs text-fg-secondary">
					{module.trail.length > 0
						? module.trail.join(" / ")
						: module.url.replace(/^https?:\/\//, "")}
				</span>
			</Band>
			<Band>
				<h3 className="font-semibold text-md">{module.title}</h3>
				<p className="mt-2 text-pretty text-base text-ink-2 leading-relaxed">
					{module.body}
				</p>
			</Band>
			<Band divide>
				<Eyebrow>ON THIS PAGE</Eyebrow>
				<ul className="mt-2.5 flex flex-col gap-1.5 text-sm">
					{module.sections.map((section) => (
						<li className="flex gap-2.5 text-ink-2" key={section}>
							<span className="text-fg-tertiary">·</span>
							<span className="min-w-0">{section}</span>
						</li>
					))}
				</ul>
			</Band>
			{module.facts.length > 0 ? (
				<Band divide>
					<FactTable facts={module.facts} />
				</Band>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function NavigationCard({ module }: Card<"navigation">) {
	return (
		<ModuleCard className="border-ink-0">
			<a
				className="flex items-center gap-3.5 px-4 py-4 transition-colors duration-fast ease-out hover:bg-bg-sunken sm:px-5"
				href={module.url}
				rel="noopener noreferrer"
				target="_blank"
			>
				<span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-accent-soft">
					<RemoteImage fit="contain" src={module.favicon} />
				</span>
				<span className="min-w-0 flex-1">
					<span className="block truncate font-semibold text-md">
						{module.name}
					</span>
					<span className="mt-0.5 block truncate font-mono text-2xs text-fg-tertiary">
						{module.url.replace(/^https?:\/\//, "")}
					</span>
				</span>
				<span className="shrink-0 rounded-pill bg-accent px-3 py-1.5 font-medium text-fg-on-accent text-sm">
					Go ↗
				</span>
			</a>
			{module.links.length > 0 ? (
				<Rows>
					{module.links.map((link) => (
						<Row href={link.url} key={link.url}>
							<span className="flex items-center justify-between gap-3">
								<span className="truncate">{link.label}</span>
								<span className="shrink-0 text-fg-tertiary">→</span>
							</span>
						</Row>
					))}
				</Rows>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function ResearchCard({ module }: Card<"research">) {
	return (
		<ModuleCard>
			<Band>
				<Eyebrow>PAPERS</Eyebrow>
			</Band>
			<Rows>
				{module.papers.map((paper) => (
					<Row href={paper.url} key={paper.id}>
						<span className="grid grid-cols-[1fr_auto] items-baseline gap-3">
							<span className="min-w-0">
								<span className="font-medium">{paper.title}</span>
								{paper.by ? (
									<span className="text-fg-secondary"> · {paper.by}</span>
								) : null}
							</span>
							<span className="shrink-0 font-mono text-2xs text-fg-tertiary">
								{paper.year ?? ""}
							</span>
						</span>
					</Row>
				))}
			</Rows>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function EducationCard({ module }: Card<"education">) {
	return (
		<ModuleCard>
			<Band>
				<Eyebrow>COURSES</Eyebrow>
			</Band>
			<Rows>
				{module.steps.map((step) => (
					<Row href={step.url} key={step.id}>
						<span className="grid grid-cols-[1fr_auto] items-baseline gap-3">
							<span className="min-w-0">
								<span className="font-medium">{step.title}</span>
								{step.provider ? (
									<span className="text-fg-secondary"> · {step.provider}</span>
								) : null}
							</span>
							{step.time ? (
								<span className="shrink-0 font-mono text-2xs text-fg-tertiary">
									{step.time}
								</span>
							) : null}
						</span>
					</Row>
				))}
			</Rows>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function HealthCard({ module }: Card<"health">) {
	const facts = [
		...(module.reviewedBy
			? [{ label: "Reviewed by", value: module.reviewedBy }]
			: []),
		...(module.lastReviewed
			? [{ label: "Last reviewed", value: module.lastReviewed }]
			: []),
		...(module.domains.length > 0
			? [{ label: "Sources", value: module.domains.join(" · ") }]
			: []),
	];
	return (
		<ModuleCard>
			<Band>
				<Eyebrow className="text-accent-strong">CLINICALLY REVIEWED</Eyebrow>
				<div className="mt-2.5">
					<FactTable facts={facts} />
				</div>
			</Band>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

/* -- Occasions and places ------------------------------------------------- */

export function EventCard({ module }: Card<"event">) {
	const { month, day, weekday } = dayParts(module.start);
	return (
		<ModuleCard>
			<div className="flex gap-4 px-4 py-4 sm:gap-5 sm:px-5">
				<div className="w-[76px] shrink-0 overflow-hidden rounded-md border border-ink-0 text-center">
					<div className="bg-ink-0 py-1 font-mono text-2xs text-paper-0">
						{month}
					</div>
					<div className="pt-2 pb-0.5 font-bold text-xl leading-none">
						{day}
					</div>
					<div className="pb-1.5 font-mono text-2xs text-fg-tertiary">
						{weekday}
					</div>
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-semibold text-md leading-snug tracking-tight">
						{module.name}
					</h3>
					{module.venue || module.locality ? (
						<p className="mt-1.5 text-fg-secondary text-sm">
							{[module.venue, module.locality].filter(Boolean).join(" · ")}
						</p>
					) : null}
					{module.chips.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-2">
							{module.chips.map((chip, index) =>
								index === 0 ? (
									<AccentChip key={chip}>{chip}</AccentChip>
								) : (
									<span
										className="rounded-pill border border-border-default px-2.5 py-1 font-mono text-2xs text-fg-secondary"
										key={chip}
									>
										{chip}
									</span>
								),
							)}
						</div>
					) : null}
				</div>
			</div>
			{module.facts.length > 0 ? (
				<Band divide>
					<FactTable facts={module.facts} />
				</Band>
			) : null}
			{module.url ? (
				<Row href={module.url}>
					<span className="flex items-center justify-between gap-3">
						<span className="text-fg-secondary">Details and tickets</span>
						<span className="shrink-0 text-fg-tertiary">→</span>
					</span>
				</Row>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function LocalCard({ module }: Card<"local">) {
	return (
		<ModuleCard>
			<Band>
				<Eyebrow>PLACES</Eyebrow>
			</Band>
			<Rows>
				{module.venues.map((venue) => (
					<Row href={venue.url} key={`${venue.name}-${venue.address}`}>
						<span className="block">
							<span className="font-medium">{venue.name}</span>
							{venue.address ? (
								<span className="text-fg-secondary"> · {venue.address}</span>
							) : null}
						</span>
						{venue.hours || venue.telephone ? (
							<span className="mt-1 block font-mono text-2xs text-fg-tertiary">
								{[venue.hours, venue.telephone].filter(Boolean).join("  ·  ")}
							</span>
						) : null}
					</Row>
				))}
			</Rows>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function ShoppingCard({ module }: Card<"shopping">) {
	return (
		<ModuleCard>
			<div className="flex gap-4 px-4 py-4 sm:px-5">
				{module.image ? (
					<span className="h-[92px] w-[118px] shrink-0 overflow-hidden rounded-md bg-bg-sunken">
						<RemoteImage fit="contain" src={module.image} />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<h3 className="font-semibold text-md leading-snug">{module.name}</h3>
					{module.brand ? (
						<p className="mt-1 text-fg-secondary text-sm">{module.brand}</p>
					) : null}
					{module.rating ? (
						<div className="mt-2.5">
							<AccentChip>
								{module.rating.value} RATED
								{module.rating.count ? ` · ${module.rating.count}` : ""}
							</AccentChip>
						</div>
					) : null}
				</div>
			</div>
			<div className="grid grid-cols-[1fr_auto_auto] gap-3 border-border-default border-t px-4 py-2.5 sm:px-5">
				<Eyebrow>SELLER</Eyebrow>
				<Eyebrow className="text-right">PRICE</Eyebrow>
				<Eyebrow className="w-[84px] text-right">STOCK</Eyebrow>
			</div>
			<Rows>
				{module.offers.map((offer) => (
					<Row href={offer.url} key={`${offer.seller}-${offer.price}`}>
						<span className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
							<span className="truncate">{offer.seller}</span>
							<span className="text-right font-mono">{offer.price}</span>
							<span className="w-[84px] text-right font-mono text-2xs text-accent-strong">
								{offer.availability ?? ""}
							</span>
						</span>
					</Row>
				))}
			</Rows>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function TravelLikeEntertainmentCard({ module }: Card<"entertainment">) {
	return (
		<ModuleCard>
			<div className="flex gap-4 px-4 py-4 sm:px-5">
				{module.poster ? (
					<span className="h-[150px] w-[104px] shrink-0 overflow-hidden rounded-md bg-bg-sunken">
						<RemoteImage src={module.poster} />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<h3 className="font-semibold text-lg leading-tight tracking-tight">
						{module.title}
					</h3>
					{module.meta.length > 0 ? (
						<Eyebrow className="mt-1.5">{module.meta.join(" · ")}</Eyebrow>
					) : null}
					{module.chips.length > 0 ? (
						<div className="mt-3 flex flex-wrap gap-2">
							{module.chips.map((chip, index) =>
								index === 0 ? (
									<AccentChip key={chip}>{chip}</AccentChip>
								) : (
									<span
										className="rounded-pill border border-border-default px-2.5 py-1 font-mono text-2xs text-fg-secondary"
										key={chip}
									>
										{chip}
									</span>
								),
							)}
						</div>
					) : null}
					{module.description ? (
						<p className="mt-3 text-pretty text-ink-2 text-sm leading-relaxed">
							{module.description}
						</p>
					) : null}
				</div>
			</div>
			{module.where.length > 0 ? (
				<Rows>
					{module.where.map((where) => (
						<Row href={where.url} key={`${where.name}-${where.detail}`}>
							<span className="flex items-center justify-between gap-3">
								<span className="truncate">{where.name}</span>
								<span className="shrink-0 font-mono text-2xs text-fg-secondary">
									{where.detail ?? ""}
								</span>
							</span>
						</Row>
					))}
				</Rows>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

/* -- Time and media ------------------------------------------------------- */

export function NewsCard({ module }: Card<"news">) {
	return (
		<ModuleCard>
			<Band>
				<Eyebrow>TIMELINE</Eyebrow>
			</Band>
			<Rows>
				{module.items.map((item) => (
					<Row href={item.url} key={item.id}>
						<span className="grid grid-cols-[78px_1fr] gap-3 sm:grid-cols-[86px_1fr_112px]">
							<span
								className={cn(
									"font-mono text-2xs",
									item.fresh ? "text-accent-strong" : "text-fg-tertiary",
								)}
							>
								{item.when}
							</span>
							<span className="min-w-0">{item.title}</span>
							<span className="hidden truncate text-right font-mono text-2xs text-fg-tertiary sm:block">
								{item.outlet}
							</span>
						</span>
					</Row>
				))}
			</Rows>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function VideoCard({ module }: Card<"video">) {
	return (
		<ModuleCard>
			{module.thumbnail ? (
				<a
					className="block aspect-[16/9] w-full overflow-hidden bg-bg-sunken"
					href={module.url}
					rel="noopener noreferrer"
					target="_blank"
				>
					<RemoteImage src={module.thumbnail} />
				</a>
			) : null}
			<Band>
				<h3 className="font-semibold text-md leading-snug">{module.title}</h3>
				<Eyebrow className="mt-1.5">
					{[module.by, module.length, module.uploaded]
						.filter(Boolean)
						.join(" · ")}
				</Eyebrow>
			</Band>
			{module.chapters.length > 0 ? (
				<Rows>
					{module.chapters.map((chapter, index) => (
						<Row key={chapter.at + chapter.label}>
							<span className="flex gap-3.5">
								<span
									className={cn(
										"font-mono",
										index === 0 ? "text-accent-strong" : "text-fg-tertiary",
									)}
								>
									{chapter.at}
								</span>
								<span className="min-w-0 flex-1">{chapter.label}</span>
							</span>
						</Row>
					))}
				</Rows>
			) : null}
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function CodingCard({ module }: Card<"coding">) {
	return (
		<ModuleCard>
			<Band className="flex items-center gap-2 border-border-default border-b">
				<Pills items={[module.language ?? "CODE"]} />
				{module.title ? (
					<span className="ml-auto truncate font-mono text-2xs text-fg-tertiary">
						{module.title}
					</span>
				) : null}
			</Band>
			<CodeSlab>{module.code}</CodeSlab>
			<Provenance>{module.provenance}</Provenance>
		</ModuleCard>
	);
}

export function UtilityCard({ module }: Card<"utility">) {
	return (
		<ModuleCard>
			<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-6 sm:px-5">
				<div>
					<Eyebrow>{module.from.unit}</Eyebrow>
					<div className="mt-1.5 border-border-strong border-b pb-2 font-mono font-semibold text-xl">
						{module.from.value}
					</div>
				</div>
				<span className="font-mono text-fg-tertiary text-md">=</span>
				<div>
					<Eyebrow>{module.to.unit}</Eyebrow>
					<div className="mt-1.5 border-border-default border-b pb-2 font-mono font-semibold text-accent-strong text-xl">
						{module.to.value}
					</div>
				</div>
			</div>
			{module.alternates.length > 0 ? (
				<div className="grid grid-cols-3 border-border-default border-t">
					{module.alternates.map((alternate, index) => (
						<div
							className={cn(
								"px-4 py-3 sm:px-5",
								index > 0 && "border-border-default border-l",
							)}
							key={alternate.label}
						>
							<Eyebrow>{alternate.label}</Eyebrow>
							<div className="mt-1 font-mono text-sm">{alternate.value}</div>
						</div>
					))}
				</div>
			) : null}
		</ModuleCard>
	);
}

export function ComparisonModuleCard({ module }: Card<"comparison">) {
	return (
		<ModuleCard>
			<Band className="border-border-default border-b">
				<Eyebrow>COMPARISON · COMPOSED FROM THE SOURCES</Eyebrow>
			</Band>
			{/* Wide content scrolls inside its own box; the page never scrolls
			    sideways because a table has four columns. */}
			<div className="scroll-region overflow-x-auto">
				<table className="w-full min-w-[440px] border-collapse text-sm">
					<thead>
						<tr>
							<th className="px-4 py-2.5 text-left font-medium sm:px-5" />
							{module.subjects.map((subject) => (
								<th
									className="px-3 py-2.5 text-left font-semibold"
									key={subject}
									scope="col"
								>
									{subject}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{module.rows.map((row) => (
							<tr key={row.criterion}>
								<th
									className="border-border-default border-t px-4 py-2.5 text-left font-normal text-fg-secondary sm:px-5"
									scope="row"
								>
									{row.criterion}
								</th>
								{row.cells.map((cell, index) => (
									<td
										className={cn(
											"border-border-default border-t px-3 py-2.5",
											// Only where the model marked one. No highlight is a
											// real answer: the sources did not take a side.
											row.best.includes(index) && "bg-accent-soft font-medium",
											/[\d$£€]/.test(cell) && "font-mono",
										)}
										key={`${row.criterion}-${module.subjects[index] ?? index}`}
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</ModuleCard>
	);
}
