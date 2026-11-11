"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { mediaUrl, putMedia, MAX_VIDEO_MB } from "@/lib/media";

// A video field: upload or drop a clip, or paste a link to an .mp4 or .webm file.
// The clip plays as the scroll film on the site and is copied into the download.
export default function VideoField({ label, value, onChange, autoFocus }: { label?: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [src, setSrc] = useState("");
  useEffect(() => {
    let on = true;
    if (value?.startsWith("media:")) mediaUrl(value).then((u) => on && setSrc(u));
    else setSrc(value || "");
    return () => {
      on = false;
    };
  }, [value]);
  const take = async (f: Blob | null | undefined) => {
    if (!f) return;
    if (!/^video\//.test(f.type)) return setErr("That file is not a video. Use an MP4 or WebM clip.");
    setErr("");
    setBusy(true);
    try {
      onChange(await putMedia(f));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="img-field">
      {label && <label className="lbl">{label}</label>}
      <div
        className={"img-drop" + (over ? " is-over" : "") + (src ? " has-img" : "")}
        tabIndex={0}
        autoFocus={autoFocus}
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
        {src ? <video src={src} muted playsInline loop autoPlay /> : <span className="small muted">{busy ? "Saving your clip" : "Drop a video here. Scrolling the page will scrub through it."}</span>}
      </div>
      <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => file.current?.click()} disabled={busy}>
          <Icon name="upload" size={14} />
          Upload video
        </button>
        {value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>
            Remove
          </button>
        )}
        <input ref={file} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      </div>
      <input
        type="url"
        aria-label={(label || "Video") + " link"}
        style={{ marginTop: 8 }}
        placeholder="Or paste a link to an .mp4 file"
        value={value?.startsWith("media:") ? "" : value || ""}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      <p className="small muted" style={{ marginTop: 6 }}>
        Short clips work best: 5 to 15 seconds, under {MAX_VIDEO_MB} MB. A slow camera move or a product turning looks great.
      </p>
      {err && (
        <p className="small" style={{ color: "var(--danger, #b42318)", marginTop: 6 }} role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
