import { redirect } from "next/navigation";

// The old template animator now lives inside the journey's template step.
export default function Page() {
  redirect("/create");
}
