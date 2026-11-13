"use client";

import { useRouter } from "next/navigation";
import DocIntake from "@/components/DocIntake";
import Topbar from "@/components/Topbar";
import { saveProject } from "@/lib/store";

// Requirements document to website: upload a PRD, BRD or brief, check what was read, build.
export default function DocumentPage() {
  const router = useRouter();
  return (
    <>
      <Topbar />
      <main className="page" style={{ maxWidth: 920, paddingTop: 48 }}>
        <p className="eyebrow">
          <span className="mono">From a document</span>
        </p>
        <h1>Turn a requirements document into a website</h1>
        <p className="lede" style={{ marginTop: 12, marginBottom: 28, maxWidth: 680 }}>
          Upload the PRD, BRD or brief you already wrote. The builder reads it on your device, shows you what it understood, and builds the site. Change anything before or after.
        </p>
        <DocIntake
          onProject={(p) => {
            saveProject(p);
            router.push(`/build/${p.id}`);
          }}
        />
        <ol className="doc-steps" style={{ marginTop: 40 }}>
          <li>
            <b>Upload</b>
            <span>PDF, Word, Markdown or plain text. The file never leaves your browser.</span>
          </li>
          <li>
            <b>Check</b>
            <span>See the name, features, prices, questions and tone it found, and where each came from.</span>
          </li>
          <li>
            <b>Build</b>
            <span>Get a finished site in a design made for you. Edit every part, then download it.</span>
          </li>
        </ol>
      </main>
    </>
  );
}
