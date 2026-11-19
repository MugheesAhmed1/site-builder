import mount from "./index";
import mountModel from "./model";

// Entry of site-3d.js, the downloaded site's 3D layer: it registers itself for the stage,
// and the model view for sections that show a 3D GLB (components/Block.tsx).
(window as Window & { __xp3d?: typeof mount; __xp3dModel?: typeof mountModel }).__xp3d = mount;
(window as Window & { __xp3dModel?: typeof mountModel }).__xp3dModel = mountModel;
