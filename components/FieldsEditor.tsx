"use client";

import Icon from "@/components/Icon";
import ImageField from "@/components/ImageField";

// A form that edits any JSON object: text becomes inputs, lists get add/remove/move
// buttons. Used to edit the extracted résumé and every word of the portfolio.

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const LONG_KEYS = /summary|description|intro|blurb|quote|impact|tagline|paragraph|bullets|highlights/i;

function label(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

function emptyLike(v: Json): Json {
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, emptyLike(x)]));
  return "";
}

function itemTitle(v: Json, i: number): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of ["name", "role", "title", "company", "group", "school", "question", "label"]) {
      const x = (v as Record<string, Json>)[k];
      if (typeof x === "string" && x) return x;
    }
  }
  return `Item ${i + 1}`;
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function Value({ name, value, onChange, depth }: { name: string; value: Json; onChange: (v: Json) => void; depth: number }) {
  if (typeof value === "number") {
    return (
      <div>
        <label className="lbl" style={{ textTransform: "capitalize" }}>{label(name)}</label>
        <input type="number" step="any" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  if ((typeof value === "string" || value === null) && /imageUrl|photoUrl|^image$|^photo$/i.test(name)) {
    return <ImageField label={label(name).replace(/ url$/i, "")} value={value ?? ""} onChange={onChange} />;
  }
  if (typeof value === "string" || value === null) {
    const long = LONG_KEYS.test(name) || (value?.length ?? 0) > 90;
    return (
      <div>
        <label className="lbl" style={{ textTransform: "capitalize" }}>{label(name)}</label>
        {long ? (
          <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={Math.min(6, Math.max(2, Math.ceil((value?.length ?? 0) / 80)))} />
        ) : (
          <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    );
  }
  if (typeof value === "boolean") {
    return (
      <label className="row">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} /> {label(name)}
      </label>
    );
  }
  if (Array.isArray(value)) {
    const stringList = value.every((x) => typeof x === "string");
    if (stringList) {
      return (
        <div>
          <label className="lbl" style={{ textTransform: "capitalize" }}>{label(name)}</label>
          <div className="stack" style={{ gap: 6 }}>
            {(value as string[]).map((s, i) => (
              <div className="fe-str-row" key={i}>
                {LONG_KEYS.test(name) ? (
                  <textarea rows={2} value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
                ) : (
                  <input type="text" value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
                )}
                <button className="btn btn-ghost btn-sm btn-icon" aria-label="Move up" title="Move up" onClick={() => onChange(move(value, i, -1))}><Icon name="up" size={16} /></button>
                <button className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label="Remove" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button>
              </div>
            ))}
            <button className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...value, ""])}>
              <Icon name="plus" size={14} /> Add
            </button>
          </div>
        </div>
      );
    }
    return (
      <details className="fe-group" open={depth < 1}>
        <summary>
          {label(name)} <span className="muted small">({value.length})</span>
        </summary>
        <div className="fe-fields">
          {value.map((item, i) => (
            <div className="fe-item" key={i}>
              <div className="fe-item-head">
                <strong className="small">{itemTitle(item, i)}</strong>
                <div className="row" style={{ gap: 2 }}>
                  <button className="btn btn-ghost btn-sm btn-icon" aria-label="Move up" title="Move up" onClick={() => onChange(move(value, i, -1))}><Icon name="up" size={16} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" aria-label="Move down" title="Move down" onClick={() => onChange(move(value, i, 1))}><Icon name="down" size={16} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon btn-danger" aria-label="Remove" title="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button>
                </div>
              </div>
              <Value name={name} value={item} depth={depth + 1} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
            </div>
          ))}
          <button
            className="btn btn-sm"
            style={{ justifySelf: "start" }}
            onClick={() => onChange([...value, value.length ? emptyLike(value[0]) : ""])}
          >
            <Icon name="plus" size={14} /> Add {label(name).replace(/ies$/, "y").replace(/s$/, "")}
          </button>
        </div>
      </details>
    );
  }
  const obj = value as Record<string, Json>;
  const body = (
    <div className="fe-fields">
      {Object.entries(obj).map(([k, v]) => (
        <Value key={k} name={k} value={v} depth={depth + 1} onChange={(nv) => onChange({ ...obj, [k]: nv })} />
      ))}
    </div>
  );
  if (depth === 0 || /^\d+$/.test(name) || depth > 1) return body;
  return (
    <details className="fe-group" open={depth < 1}>
      <summary>{label(name)}</summary>
      {body}
    </details>
  );
}

export default function FieldsEditor<T>({ value, onChange, skip = [] }: { value: T; onChange: (v: T) => void; skip?: string[] }) {
  const obj = value as unknown as Record<string, Json>;
  return (
    <div className="stack">
      {Object.entries(obj)
        .filter(([k]) => !skip.includes(k))
        .map(([k, v]) => (
          <Value key={k} name={k} value={v} depth={1} onChange={(nv) => onChange({ ...(obj as object), [k]: nv } as unknown as T)} />
        ))}
    </div>
  );
}
