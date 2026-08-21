import { href } from "../structured";
import type { SearchRun } from "../types";
import type { ResultModule } from "./index";

/**
 * One destination, and the pages under it worth going to instead.
 *
 * The API resolves this before it retrieves anything. `classifyStructurally`
 * recognises either a typed hostname — the most precise destination there is —
 * or a name the entity registry holds an official domain for, and returns with
 * confidence 1 without asking a model. Until now that resolution was used for
 * ranking and thrown away; this card is it, made visible.
 *
 * The sitelinks are not invented. They are the other results the search already
 * returned *from that same domain*, in rank order — which is what a sitelink has
 * always been. Nothing is fetched and no menu is guessed at.
 *
 * The design's artboard ends with `ONE DESTINATION · NO ANSWER GENERATED`.
 * That is aspirational here: the answer bubble above this card is still
 * composed. The footer says what is actually true instead.
 */
export function readNavigation(run: SearchRun): ResultModule | null {
	const domain = run.intent?.officialDomain;
	if (!domain) return null;

	// The official URL when the registry holds one; otherwise the top result on
	// that domain, which is the best evidence available of where its front door
	// is. `matchesOfficial` lives on the API side, so the apex comparison is
	// done the simple way here — the registry stores the apex form and a result
	// carries a full hostname.
	const onDomain = run.sources.filter(
		(source) =>
			source.domain === domain || source.domain.endsWith(`.${domain}`),
	);
	const url = href(run.intent?.officialUrl) ?? onDomain[0]?.url;
	if (!url) return null;

	const links = onDomain
		.filter((source) => source.url !== url)
		.slice(0, 4)
		.map((source) => ({ label: source.title || source.path, url: source.url }));

	return {
		kind: "navigation",
		name: onDomain[0]?.title || domain,
		domain,
		url,
		links,
		provenance: links.length
			? "DESTINATION RESOLVED BEFORE SEARCHING · LINKS ARE RESULTS ON THIS DOMAIN"
			: "DESTINATION RESOLVED BEFORE SEARCHING",
	};
}
