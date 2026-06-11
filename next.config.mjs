/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Prisma out of the webpack bundle so the OpenNext/workerd build
  // resolves the generated client's WASM engine (required for D1 on Workers).
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

// Make Cloudflare bindings (D1, secrets) available during `next dev`.
// Falls back silently when the local workerd runtime isn't available —
// the app then uses the plain SQLite dev database instead.
try {
  const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
  await initOpenNextCloudflareForDev();
} catch {
  // not running in a Cloudflare-capable environment — plain Node dev
}
