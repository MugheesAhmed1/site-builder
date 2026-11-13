import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Requirements document to website",
  description: "Upload a PRD, BRD or website brief and get a finished, editable website. Read on your device, no AI, nothing uploaded.",
};

export default function DocumentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
