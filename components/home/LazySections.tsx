"use client";

import Lazy from "@/components/home/Lazy";

export function LazyGallery() {
  return <Lazy label="Experience Gallery" minHeight={900} load={() => import("@/components/home/ExperienceGallery")} />;
}
