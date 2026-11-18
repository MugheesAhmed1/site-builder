import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import TemplateIndex from "@/components/templates/TemplateIndex";
import { TEMPLATES } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Templates by business type",
  description: "Whole-site templates filed by the kind of business they suit. Change every word, picture, colour, font, section and motion setting, then download the site or its source.",
};

export default function Page() {
  return (
    <>
      <Topbar />
      <main className="page" style={{ paddingTop: 48 }}>
        <p className="eyebrow">
          <span className="mono">Full templates</span>
        </p>
        <h1>Templates by business type</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 28, maxWidth: 680 }}>
          {TEMPLATES.length} whole sites, each filed under the businesses it suits. Open one and change every part of it for your project: words, lists, pictures, video, links, colours, fonts, sections and motion.
        </p>
        <TemplateIndex />
      </main>
    </>
  );
}
