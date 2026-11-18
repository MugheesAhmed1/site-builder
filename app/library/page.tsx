import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import LibraryIndex from "@/components/library/LibraryIndex";
import { BLOCKS, MEDIA } from "@/lib/library-blocks";

export const metadata: Metadata = {
  title: "Block and asset library",
  description: "Sections, 3D scenes and effects taken from every template, plus their pictures, fonts and palettes. Add any of them to any template and change every setting.",
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
          {BLOCKS.length} blocks and {MEDIA.length} pictures and films taken from every template. Open any template, add a block from its Library blocks group, and change every word, picture, colour and motion setting in it.
        </p>
        <LibraryIndex />
      </main>
    </>
  );
}
