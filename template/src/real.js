// The real-life pack: photoreal characters, fish and particle sprites. Every picture was
// generated for this library with Pollinations.ai (free, no account) from an original prompt,
// then cut out and saved as a small transparent WebP in public/real. Nothing is generated
// while a site runs: the pictures are plain files and a downloaded site carries the ones it uses.

// Where the pictures live. A site served from its root uses the paths as they are; the
// ready-to-host download sets window.__ASSET_BASE__ to "." so it also works in a sub-folder.
export function asset(path) {
  const base = typeof window !== "undefined" ? window.__ASSET_BASE__ : "";
  return base && typeof path === "string" && path[0] === "/" && path[1] !== "/" ? base + path : path;
}

