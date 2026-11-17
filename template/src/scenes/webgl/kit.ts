import mount from "./index";

// Entry of site-3d.js, the downloaded site's 3D layer: it registers itself for the stage.
(window as Window & { __xp3d?: typeof mount }).__xp3d = mount;
