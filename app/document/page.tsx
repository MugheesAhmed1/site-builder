import { redirect } from "next/navigation";

// The requirements-document start belonged to the PRD journey, which the character journey
// replaced (docs/CHARACTER-JOURNEY.md). Every site now starts from one line at /create.
export default function DocumentPage() {
  redirect("/create");
}
