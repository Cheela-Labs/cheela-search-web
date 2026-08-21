"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { AnswerBlock, Source } from "@/lib/search/types";
import { ResultModuleCard } from "./modules";

/**
 * The answer, one bubble at a time.
 *
 * Each block enters once and never re-animates, which is why they are keyed by
 * id and appended rather than re-rendered from a growing string.
 */

type BlockContext = {
	sources: Source[];
	onSubmitQuery: (query: string) => void;
};

const CARD = "w-full max-w-[720px] rounded-md";

function AnswerCard({ text }: { text: string }) {
	return (
		<div className={cn(CARD, "bg-ink-1 px-5 py-5 text-paper-0 sm:px-6")}>
			<div className="font-mono text-2xs text-ink-6 tracking-wide">ANSWER</div>
			<p className="mt-2.5 text-pretty font-semibold text-md leading-snug tracking-tight sm:text-lg">
				{text}
			</p>
		</div>
	);
}

function NoteCard({ label, text }: { label: string; text: string }) {
	return (
		<div
			className={cn(
				CARD,
				"border border-border-default bg-bg-surface px-4 py-4 sm:px-5 sm:py-[18px]",
			)}
		>
			<div className="font-mono text-2xs text-fg-secondary tracking-wide">
				{label}
			</div>
			<p className="mt-2 text-pretty text-base text-ink-2 leading-relaxed">
				{text}
			</p>
		</div>
	);
}

function ComparisonCard({
	label,
	columns,
	rows,
}: {
	label: string;
	columns: string[];
	rows: { label: string; cells: string[] }[];
}) {
	return (
		<div
			className={cn(
				CARD,
				"overflow-hidden border border-border-default bg-bg-surface",
			)}
		>
			<div className="px-4 pt-3.5 pb-2.5 font-mono text-2xs text-fg-secondary tracking-wide sm:px-5">
				{label}
			</div>
			{/* Wide content scrolls inside its own box; the page never scrolls
			    sideways because a table has four columns. */}
			<div className="scroll-region overflow-x-auto">
				<table className="w-full min-w-[420px] border-collapse text-sm">
					<thead>
						<tr>
							<th className="border-border-default border-t px-4 py-2.5 text-left font-medium sm:px-5" />
							{columns.map((column) => (
								<th
									className="border-border-default border-t px-3 py-2.5 text-left font-medium"
									key={column}
									scope="col"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.label}>
								<th
									className="border-border-default border-t px-4 py-2.5 text-left font-normal text-fg-secondary sm:px-5"
									scope="row"
								>
									{row.label}
								</th>
								{row.cells.map((cell, index) => (
									<td
										className={cn(
											"border-border-default border-t px-3 py-2.5",
											// Numbers line up only in the mono face; the
											// prose cells would look wrong in it.
											/[\d$]/.test(cell) && "font-mono",
										)}
										key={`${row.label}-${columns[index] ?? index}`}
									>
										{cell}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function ActionCard({
	block,
	context,
}: {
	block: Extract<AnswerBlock, { kind: "action" }>;
	context: BlockContext;
}) {
	const [revealed, setRevealed] = useState(false);
	const capability = block.capability;

	return (
		<div
			className={cn(
				CARD,
				"border border-ink-0 bg-bg-surface px-4 py-4 sm:px-5",
			)}
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
				<div className="min-w-0 flex-1">
					<div className="font-mono text-2xs text-fg-secondary tracking-wide">
						{block.label}
					</div>
					<p className="mt-1.5 text-base text-ink-2">{block.prompt}</p>
					{capability ? (
						<div className="mt-2.5 flex flex-wrap items-center gap-2">
							<span className="truncate font-mono text-2xs text-fg-tertiary">
								{capability.invocationName}
							</span>
							<span className="rounded-pill border border-border-default bg-bg-sunken px-2 py-0.5 font-mono text-2xs text-fg-secondary uppercase">
								{capability.effects}
							</span>
						</div>
					) : null}
				</div>
				<Button
					onClick={() =>
						capability ? setRevealed(true) : context.onSubmitQuery(block.prompt)
					}
					variant="primary"
				>
					{block.cta}
				</Button>
			</div>

			{/*
			  The gate, made visible. A read-tier capability on a verified domain
			  is the one thing the architecture permits calling without asking —
			  but there is no broker wired to this host, so the honest thing is to
			  show exactly what would be sent rather than to fake a result. An
			  invocation spends the runtime owner's money; inventing one in a demo
			  teaches the wrong thing about what this button does.
			*/}
			{revealed && capability ? (
				<div className="fade-in mt-3.5 rounded-sm border border-border-default bg-bg-sunken px-4 py-3">
					<div className="font-mono text-2xs text-fg-secondary tracking-wide">
						GATED · NOT INVOKED
					</div>
					<p className="mt-1.5 text-fg-secondary text-sm leading-normal">
						This capability passes the gate — transport we speak, domain
						verified, <span className="font-mono">{capability.effects}</span>{" "}
						effects tier. The invoker is not connected to this host, so nothing
						was called on <span className="font-mono">{capability.domain}</span>
						.
					</p>
				</div>
			) : null}
		</div>
	);
}

function SuggestionsCard({
	label,
	queries,
	context,
}: {
	label: string;
	queries: string[];
	context: BlockContext;
}) {
	return (
		<div
			className={cn(
				CARD,
				"border border-border-default bg-bg-surface px-4 py-4 sm:px-5",
			)}
		>
			<div className="font-mono text-2xs text-fg-secondary tracking-wide">
				{label}
			</div>
			<div className="mt-3 flex flex-col gap-2">
				{queries.map((query) => (
					<button
						className="rounded-sm border border-border-default bg-bg-page px-3.5 py-2.5 text-left text-base text-ink-2 transition-colors duration-fast ease-out hover:border-border-strong hover:bg-bg-sunken"
						key={query}
						onClick={() => context.onSubmitQuery(query)}
						type="button"
					>
						{query}
					</button>
				))}
			</div>
		</div>
	);
}

export function Block({
	block,
	context,
}: {
	block: AnswerBlock;
	context: BlockContext;
}): React.ReactElement {
	switch (block.kind) {
		case "answer":
			return <AnswerCard text={block.text} />;
		case "note":
			return <NoteCard label={block.label} text={block.text} />;
		case "comparison":
			return (
				<ComparisonCard
					columns={block.columns}
					label={block.label}
					rows={block.rows}
				/>
			);
		case "action":
			return <ActionCard block={block} context={context} />;
		case "suggestions":
			return (
				<SuggestionsCard
					context={context}
					label={block.label}
					queries={block.queries}
				/>
			);
		case "module":
			return <ResultModuleCard module={block.module} />;
	}
}

export type { BlockContext };
