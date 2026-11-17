import type { Metadata } from "next";
import ExperienceLab from "@/components/lab/ExperienceLab";

export const metadata: Metadata = {
  title: "Experience Lab",
  description: "Combine backgrounds, objects, characters, scroll, cursor, shaders, transitions and typography, and see the result on a real site.",
};

export default function Page() {
  return <ExperienceLab />;
}
