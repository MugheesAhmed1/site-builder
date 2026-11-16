// Joins class names, skipping empty ones (stands in for the usual clsx/tailwind-merge helper).
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
