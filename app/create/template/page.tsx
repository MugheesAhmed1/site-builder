import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import Animator from "@/components/create/Animator";

export const metadata: Metadata = {
  title: "Start from a whole template",
  description: "The animator engine: one line picks one of the whole-project templates and rewrites every word of it.",
  robots: { index: false },
};

// The template animator (docs/ANIMATOR.md). New sites start from a PRD at /create; this stays
// for people who want one of the whole-project templates as it is.
export default function Page() {
  return (
    <>
      <Topbar />
      <main className="page an-page">
        <Animator />
      </main>
    </>
  );
}
