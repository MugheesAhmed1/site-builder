import { ImageResponse } from "next/og";

// The picture shown when the builder's link is shared.
export const alt = "Site Builder: say what you need, get a site you own";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#FBFAF7", color: "#1A1815" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 600 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#1F6F5C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>A</div>
          Site Builder
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3 }}>Say what you need.</div>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, color: "#1F6F5C" }}>Get a site you own.</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#5c574f" }}>No AI, no sign up. Everything stays in your browser.</div>
      </div>
    ),
    size
  );
}
