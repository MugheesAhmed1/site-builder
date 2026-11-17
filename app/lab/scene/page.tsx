import { redirect } from "next/navigation";

// The Scene Lab became the Experience Lab (PRD section 63).
export default function Page() {
  redirect("/lab");
}
