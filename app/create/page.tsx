import type { Metadata } from "next";
import Topbar from "@/components/Topbar";
import Animator from "@/components/create/Animator";

export const metadata: Metadata = {
  title: "Create a site from one line",
  description: "Type what the business is, such as dentist clinic in isb. The animator engine writes a master prompt, picks a template and blocks, and builds a moving site you can change and download.",
};

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
