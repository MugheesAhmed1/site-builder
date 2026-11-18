// Safe defaults for every response. There is no CSP yet: the builder runs inline scripts for
// fonts and Next's own bootstrap, so a strict policy needs nonces first.
const base = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const headers = [...base, { key: "X-Frame-Options", value: "DENY" }];
// Imported templates (public/tpl) run in a frame on the builder's own pages, and nowhere else.
const framed = [...base, { key: "X-Frame-Options", value: "SAMEORIGIN" }, { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // The preview frame is sandboxed (no same origin), so its module scripts are cross-origin requests.
  { key: "Access-Control-Allow-Origin", value: "*" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      { source: "/((?!tpl/|lib/).*)", headers },
      { source: "/tpl/:path*", headers: framed },
      // Shared library blocks load inside those same frames.
      { source: "/lib/:path*", headers: framed },
      // Pictures and the site kit never change under the same name, so browsers can keep them.
      { source: "/real/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/scenes/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
};
export default nextConfig;
