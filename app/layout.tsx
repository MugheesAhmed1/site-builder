import type { Metadata } from "next";
import "./globals.css";
import "@/template/src/portfolio.css";

export const metadata: Metadata = {
  title: "Portfolio Builder",
  description: "Turn your résumé into a portfolio website, step by step.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
