import type { Metadata } from "next";
import SitesDashboard from "@/components/SitesDashboard";

export const metadata: Metadata = { title: "Your sites", robots: { index: false } };

export default function SitesPage() {
  return <SitesDashboard />;
}
