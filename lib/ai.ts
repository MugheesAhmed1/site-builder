"use client";

import { getSettings } from "./store";
import type { AiRequest } from "./types";

// Calls the server's /api/ai route, shows progress while Claude writes,
// and turns the answer into a JavaScript object.

export async function askClaude<T>(req: AiRequest, onProgress?: (chars: number) => void): Promise<T> {
  const settings = getSettings();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (settings.apiKey) headers["x-anthropic-key"] = settings.apiKey;
  if (settings.accessCode) headers["x-access-code"] = settings.accessCode;

  const res = await fetch("/api/ai", { method: "POST", headers, body: JSON.stringify(req) });
  if (!res.ok || !res.body) {
    throw new Error((await res.text()) || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onProgress?.(text.length);
  }
  const errAt = text.indexOf("[[ERROR]]");
  if (errAt >= 0) throw new Error(text.slice(errAt + 9).trim());
  return removeDashes(parseJson<T>(text));
}

// House style: no em or en dashes in visible text. Claude is asked not to use them;
// this catches any that slip through. Ranges become "to", other dashes become commas.
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

export function parseJson<T>(text: string): T {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Claude's answer wasn't in the expected format. Try again.");
  try {
    return JSON.parse(t.slice(start, end + 1)) as T;
  } catch {
    throw new Error("Claude's answer wasn't valid JSON. Try again.");
  }
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
