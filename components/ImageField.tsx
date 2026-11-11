"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";
import { imageFromClipboard, imageToDataUrl } from "@/lib/edit";

// A picture field: upload a file, drop one on it, paste one (Ctrl or Cmd + V), or paste a link.
export default function ImageField({ label, value, onChange, autoFocus }: { label?: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const take = async (f: Blob | null | undefined) => {
    if (!f) return;
    setErr("");
    try {
      onChange(await imageToDataUrl(f));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const isData = value?.startsWith("data:");
  return (
    <div className="img-field">
      {label && <label className="lbl" style={{ textTransform: "capitalize" }}>{label}</label>}
      <div
        className={"img-drop" + (over ? " is-over" : "") + (value ? " has-img" : "")}
        tabIndex={0}
        autoFocus={autoFocus}
        onPaste={(e) => {
          const f = imageFromClipboard(e);
          if (f) {
            e.preventDefault();
            take(f);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files[0]);
        }}
      >
        {value ? <img src={value} alt="" /> : <span className="small muted">Drop a picture here, or click here and paste one</span>}
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => file.current?.click()}>
          <Icon name="upload" size={14} />
          Upload
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={async () => {
            setErr("");
            try {
              const items = await navigator.clipboard.read();
              for (const it of items) {
                const t = it.types.find((x) => x.startsWith("image/"));
                if (t) return take(await it.getType(t));
              }
              const text = (await navigator.clipboard.readText()).trim();
              if (/^https?:\/\//.test(text)) onChange(text);
              else setErr("There's no picture on your clipboard. Copy one first, or press Ctrl+V (Cmd+V on Mac) in the box above.");
            } catch {
              setErr("Your browser blocked reading the clipboard. Click the box above and press Ctrl+V (Cmd+V on Mac).");
            }
          }}
        >
          Paste
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => onChange("")}>
            <Icon name="x" size={14} />
            Remove
          </button>
        )}
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      </div>
      <input type="url" style={{ marginTop: 8 }} placeholder="Or paste a picture link, https://..." value={isData ? "" : value || ""} onChange={(e) => onChange(e.target.value)} aria-label={(label || "Picture") + " link"} />
      {err && <p className="small" style={{ color: "var(--danger, #c0392b)", marginTop: 6 }}>{err}</p>}
    </div>
  );
}
