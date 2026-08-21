import type { ResultModule } from "@/lib/search/modules";
import {
	CodingCard,
	ComparisonModuleCard,
	DocsCard,
	EducationCard,
	EntityCard,
	EventCard,
	HealthCard,
	LocalCard,
	NavigationCard,
	NewsCard,
	ResearchCard,
	ShoppingCard,
	TravelLikeEntertainmentCard,
	UtilityCard,
	VideoCard,
} from "./cards";

/**
 * One module, chosen by the reader that built it.
 *
 * A switch on `module.kind` rather than on the intent, because by the time a
 * module exists the intent question is already answered — `lib/search/modules`
 * decided both which reader to run and whether its data was worth rendering.
 * This only draws what it is handed.
 *
 * The union is exhaustive and the return type says so, so adding a sixteenth
 * module kind is a compile error here rather than a card that silently never
 * appears. That is the failure this file is arranged to prevent: the module
 * layer shipped once with the readers complete and no renderer at all, and it
 * typechecked, built and deployed without rendering anything.
 */
export function ResultModuleCard({
	module,
}: {
	module: ResultModule;
}): React.ReactElement {
	switch (module.kind) {
		case "entity":
			return <EntityCard module={module} />;
		case "event":
			return <EventCard module={module} />;
		case "shopping":
			return <ShoppingCard module={module} />;
		case "docs":
			return <DocsCard module={module} />;
		case "navigation":
			return <NavigationCard module={module} />;
		case "local":
			return <LocalCard module={module} />;
		case "news":
			return <NewsCard module={module} />;
		case "comparison":
			return <ComparisonModuleCard module={module} />;
		case "video":
			return <VideoCard module={module} />;
		case "research":
			return <ResearchCard module={module} />;
		case "health":
			return <HealthCard module={module} />;
		case "entertainment":
			return <TravelLikeEntertainmentCard module={module} />;
		case "education":
			return <EducationCard module={module} />;
		case "coding":
			return <CodingCard module={module} />;
		case "utility":
			return <UtilityCard module={module} />;
	}
}
