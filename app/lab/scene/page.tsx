import type { Metadata } from "next";
import SceneLab from "./SceneLab";

// A bare page that shows one scene full screen. Used to render the scene pictures for the
// pickers and to check every scene by eye. Not linked anywhere and not indexed.
export const metadata: Metadata = { title: "Scene lab", robots: { index: false, follow: false } };

export default function Page() {
  return <SceneLab />;
}
