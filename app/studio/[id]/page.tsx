import type { Metadata } from "next";
import Studio from "@/components/studio/Studio";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default async function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Studio id={id} />;
}
