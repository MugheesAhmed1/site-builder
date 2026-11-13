"use client";

import ConceptShowcase from "@/components/ConceptShowcase";
import { useStartSite } from "@/components/PromptBox";

// The scene concept gallery, wired to the one way of starting a site.
export default function ConceptSection() {
  const start = useStartSite();
  return <ConceptShowcase startKind={(kind, category, label, sceneId) => start({ kind, category, label, sceneId, vary: true })} />;
}
