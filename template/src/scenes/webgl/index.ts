import type { Mount3D } from "./core";
import { asset3d } from "./asset";
import { blob3d } from "./blob";
import { gallery3d } from "./gallery";
import { product3d } from "./product";
import { space3d } from "./space";

// The 3D engines, each original code over three.js. Loaded only when the stage asks for 3D
// (see load3d in ../Stage.tsx): in the builder through a code-split import, in a downloaded
// site as site-3d.js after the page is usable.
const mount: Mount3D = (canvas, engine, init) => {
  try {
    if (engine === "product3d") return product3d(canvas, init);
    if (engine === "blob3d") return blob3d(canvas, init);
    if (engine === "space3d") return space3d(canvas, init);
    if (engine === "gallery3d") return gallery3d(canvas, init);
    if (engine === "asset3d") return asset3d(canvas, init);
  } catch (e) {
    console.warn("3D stage", e);
  }
  return null;
};

export default mount;
