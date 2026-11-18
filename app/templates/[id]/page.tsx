import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TemplateStudio from "@/components/templates/TemplateStudio";
import { TEMPLATES, templateById } from "@/lib/templates";

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = templateById((await params).id);
  return t ? { title: `${t.name} template`, description: t.pitch } : {};
}

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const t = templateById((await params).id);
  if (!t) notFound();
  return <TemplateStudio t={t} />;
}
