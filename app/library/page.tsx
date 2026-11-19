import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import LibraryIndex from "@/components/library/LibraryIndex";
import AssetLibrary, { type AssetCard } from "@/components/library/AssetLibrary";
import { BLOCKS, MEDIA } from "@/lib/library-blocks";
import { ASSETS, isShippable, toExperienceAsset } from "@/packages/asset-library";

// The cards are built here, on the server, so the page does not ship the whole manifest.
const CARDS: AssetCard[] = ASSETS.map((a) => ({
  spec: toExperienceAsset(a, a.type === "hdri" ? "lighting" : a.category === "character" ? "hero-character" : "hero-product", a.name),
  category: a.category,
  subcategory: a.subcategory,
  tags: a.tags,
  style: a.style,
  triangles: a.performance.triangles,
  sizeMB: a.performance.fileSizeMB,
  texture: a.performance.textureResolution,
  license: a.license.type,
  attribution: a.license.attributionRequired,
  creator: a.source.creator,
  source: a.source.url,
  animation: a.performance.animation,
  modifications: a.modifications,
  shippable: isShippable(a),
}));

export const metadata: Metadata = {
  title: "Block and asset library",
  description: "Sections, 3D scenes and effects taken from every template, licence-checked 3D models and HDR lights, plus pictures, fonts and palettes. Add any of them to any template and change every setting.",
};

export default function Page() {
  return (
    <>
      <Topbar />
      <main className="page" style={{ paddingTop: 48 }}>
        <p className="eyebrow">
          <span className="mono">Shared library</span>
        </p>
        <h1>Blocks and assets for any site</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 28, maxWidth: 700 }}>
          {BLOCKS.length} blocks, {CARDS.length} 3D models and lights, and {MEDIA.length} pictures and films. Open any template, add a block from its Library blocks group, and change every word, picture, colour and motion setting in it.
        </p>
        <p className="small" style={{ marginBottom: 20 }}>
          <a href="#assets-3d">Jump to the 3D models and lighting</a>
        </p>
        <LibraryIndex />
        <div style={{ marginTop: 56 }}>
          <AssetLibrary cards={CARDS} />
        </div>
      </main>
    </>
  );
}
