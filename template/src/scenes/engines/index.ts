import type { StageEngine2D } from "../../experiences/types";
import type { StageEngineDef } from "../Stage";
import { assemble } from "./assemble";
import { brew } from "./brew";
import { character } from "./character";
import { cosmos } from "./cosmos";
import { depths } from "./depths";
import { grow } from "./grow";
import { Interface } from "./interface";
import { Kinetic } from "./kinetic";
import { landscape } from "./landscape";
import { Ledger } from "./ledger";
import { liquid } from "./liquid";
import { morph } from "./morph";
import { orbit } from "./orbit";
import { playground } from "./playground";
import { progress } from "./progress";
import { showcase } from "./showcase";

// Every 2D stage engine. Canvas engines draw a frame; DOM engines move their own elements
// (text, documents and interface panels stay crisp and selectable that way).
export const ENGINES: Record<StageEngine2D, StageEngineDef> = {
  landscape: { kind: "canvas", draw: landscape },
  depths: { kind: "canvas", draw: depths },
  cosmos: { kind: "canvas", draw: cosmos },
  brew: { kind: "canvas", draw: brew },
  morph: { kind: "canvas", draw: morph },
  grow: { kind: "canvas", draw: grow },
  assemble: { kind: "canvas", draw: assemble },
  liquid: { kind: "canvas", draw: liquid },
  playground: { kind: "canvas", draw: playground },
  character: { kind: "canvas", draw: character },
  progress: { kind: "canvas", draw: progress },
  orbit: { kind: "canvas", draw: orbit },
  showcase: { kind: "canvas", draw: showcase },
  interface: { kind: "dom", Component: Interface },
  ledger: { kind: "dom", Component: Ledger },
  kinetic: { kind: "dom", Component: Kinetic },
};
