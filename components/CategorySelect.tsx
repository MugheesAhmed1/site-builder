"use client";

import { CATEGORY_GROUPS } from "@/lib/fit";

// One menu for every category: business types and portfolio roles.
export default function CategorySelect({ value, onChange, label = "Made for" }: { value: string; onChange: (id: string) => void; label?: string }) {
  return (
    <label className="cat-select">
      <span className="lbl">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {CATEGORY_GROUPS.map((g) => (
          <optgroup key={g.title} label={g.title}>
            {g.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
