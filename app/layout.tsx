import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/template/src/portfolio.css";
import "@/template/src/cast.css";
import "@/template/src/studio.css";
import "@/template/src/showpiece.css";
import "@/template/src/cinema.css";
import "./shell.css";

const FONTS = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Hanken+Grotesk:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap";

const TITLE = "Site Builder: say it in one line, get a site that moves";
const DESCRIPTION = "Describe your business or yourself in one line and get a finished, animated website you own. Cinematic scenes, 500 design systems, no sign up, nothing leaves your browser. Download it and host it free.";

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: { default: TITLE, template: "%s · Site Builder" },
  description: DESCRIPTION,
  applicationName: "Site Builder",
  openGraph: { type: "website", title: TITLE, description: DESCRIPTION, siteName: "Site Builder" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0F16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The person's light or dark pick is applied before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('sb.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* The fonts never hold up the first paint: the sheet loads as "print" and a tiny
            script switches it on when it arrives. Without scripts the noscript copy applies. */}
        <link rel="preload" as="style" href={FONTS} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link id="app-fonts" rel="stylesheet" href={FONTS} media="print" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: "(function(){var l=document.getElementById('app-fonts');if(!l)return;function on(){l.media='all'}if(l.sheet)on();else l.addEventListener('load',on)})()" }} />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link rel="stylesheet" href={FONTS} />
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
