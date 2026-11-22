import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import Journey from "@/components/journey/Journey";

export const metadata: Metadata = {
  title: "Create your site",
  description: "Say in one line what you want to build. Answer a few questions, pick a 3D character, get a design system drawn from it and a whole site from the template library, then change every part.",
};

// The journey (docs/CHARACTER-JOURNEY.md): idea, questions, character and design, template, studio.
export default function Page() {
  return (
    <>
      <Topbar />
      <main className="page jr-page">
        <Journey />
      </main>
    </>
  );
}
