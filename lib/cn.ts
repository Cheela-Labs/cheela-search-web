/**
 * Joins class names, dropping falsy ones.
 *
 * Deliberately not `clsx` + `tailwind-merge`: nothing here overrides a
 * conflicting utility from a parent, so conflict resolution would be two
 * dependencies bought for a problem this app does not have. Variants are
 * selected from a record and composed once, which is the shape that avoids
 * needing a merger in the first place.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ");
}
