import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import PrdFlow from "@/components/prd/PrdFlow";

export const metadata: Metadata = {
  title: "Turn a requirements document into a website",
  description: "Upload your PRD, BRD or brief. Edit it as a PRD, then the site is built with every section and requirement in it.",
};

// Requirements document to website: the same PRD journey, starting from an uploaded document.
export default function DocumentPage() {
  return (
    <>
      <Topbar />
      <main className="page">
        <PrdFlow />
      </main>
    </>
  );
}
