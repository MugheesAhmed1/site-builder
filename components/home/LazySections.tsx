"use client";

import Lazy from "@/components/home/Lazy";

export function LazyConcepts() {
  return <Lazy label="Scene concepts" minHeight={900} load={() => import("@/components/home/ConceptSection")} />;
}

export function LazyCategories() {
  return <Lazy label="Kinds of site" minHeight={640} load={() => import("@/components/home/Categories")} />;
}
