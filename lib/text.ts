// House style: no em or en dashes in visible text. Ranges become "to", other dashes become commas.
export function removeDashes<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 to $2")
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s+–\s+/g, ", ")
      .replace(/–/g, " to ") as T;
  }
  if (Array.isArray(value)) return value.map(removeDashes) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, removeDashes(v)])) as T;
  }
  return value;
}

export function firstSentence(s: string, maxWords = 24): string {
  const first = (s || "").trim().split(/(?<=[.!?])\s+/)[0] ?? "";
  const words = first.split(/\s+/);
  return words.length > maxWords ? words.slice(0, maxWords).join(" ").replace(/[,;:]$/, "") + "." : first;
}

export function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function sentences(s: string): string[] {
  return (s || "").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}
