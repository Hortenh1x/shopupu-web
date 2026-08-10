import type { NextConfig } from "next";

// The browser must be allowed to reach the API origin for fetch() and <img> loads.
// Same env var the API client uses (src/lib/api/client.ts); keep them in sync.
const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const isDev = process.env.NODE_ENV !== "production";

// "Sign in with Google" loads a script + iframe from accounts.google.com; only
// widen the CSP for it when Google is actually configured, so the policy stays
// tight otherwise. https://developers.google.com/identity/gsi/web/guides/csp
const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const gsiScript = googleEnabled ? " https://accounts.google.com/gsi/client" : "";
const gsiStyle = googleEnabled ? " https://accounts.google.com/gsi/style" : "";
const gsiConnect = googleEnabled ? " https://accounts.google.com/gsi/" : "";

// Content-Security-Policy. connect-src/img-src are scoped to self + the API origin,
// so an injected script cannot exfiltrate the session to an attacker host (fetch,
// beacon, and image-pixel channels are all blocked). frame-ancestors/base-uri/
// object-src/form-action close clickjacking, base-tag, plugin, and form-hijack
// vectors. Dev additionally needs 'unsafe-eval' + ws: for React Refresh / HMR.
// Note: script-src keeps 'unsafe-inline' because Next hydration uses inline scripts
// without nonces; a nonce-based script-src via middleware is the stricter follow-up.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${gsiScript}`,
  `style-src 'self' 'unsafe-inline'${gsiStyle}`,
  `img-src 'self' data: blob: ${apiOrigin}`,
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}${isDev ? " ws:" : ""}${gsiConnect}`,
  ...(googleEnabled ? ["frame-src 'self' https://accounts.google.com/gsi/"] : []),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Sent only in production; browsers ignore HSTS over plain HTTP and on localhost.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone server output for the Docker image; regular builds keep the default
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" as const } : {}),
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

export default nextConfig;
