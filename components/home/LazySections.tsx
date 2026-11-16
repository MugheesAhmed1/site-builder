"use client";

import Lazy from "@/components/home/Lazy";

export function LazyCategories() {
  return <Lazy label="Kinds of site" minHeight={640} load={() => import("@/components/home/Categories")} />;
}
