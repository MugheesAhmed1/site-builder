"use client";

import Lazy from "@/components/home/Lazy";

export function LazyGallery() {
  return <Lazy label="Template Gallery" minHeight={900} load={() => import("@/components/home/ExperienceGallery")} />;
}
