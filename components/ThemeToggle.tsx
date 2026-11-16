"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

// Light or dark for the app. Follows the device until the person picks; the choice is
// remembered in this browser. (The pick is applied before first paint in app/layout.tsx.)
export const THEME_KEY = "sb.theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setDark(set ? set === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // The choice still holds for this visit.
    }
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={flip} aria-label={dark ? "Switch to light" : "Switch to dark"} title={dark ? "Light" : "Dark"}>
      <Icon name={dark ? "sun" : "moon"} size={16} />
    </button>
  );
}
