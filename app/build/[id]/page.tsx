import { redirect } from "next/navigation";

// Older links. Every kind of site now opens in the one studio.
export default async function OldBuilderLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect("/studio/" + id);
}
