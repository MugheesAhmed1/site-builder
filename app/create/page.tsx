import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import PrdFlow from "@/components/prd/PrdFlow";

export const metadata: Metadata = {
  title: "Create a site from a PRD",
  description: "Say in one line what you are making. Gemini drafts the product requirements document, you edit it, and the site is built with every section and requirement in it.",
};

export default function Page() {
  return (
    <>
      <Topbar />
      <main className="page prd-page">
        <PrdFlow />
      </main>
    </>
  );
}
