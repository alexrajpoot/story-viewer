// Reads settings from Netlify environment variables
// (Site configuration → Environment variables), or from a local .env when using `netlify dev`.

const number = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const config = {
  // "demo" returns built-in sample stories so the site works without any paid API.
  // "provider" calls your real upstream API (PROVIDER_* below).
  mode: (process.env.STORY_MODE || "demo").toLowerCase(),

  providerBaseUrl: process.env.PROVIDER_BASE_URL || "",
  providerApiKey: process.env.PROVIDER_API_KEY || "",
  providerApiKeyHeader: process.env.PROVIDER_API_KEY_HEADER || "x-api-key",

  // Comma-separated list of hostnames the download proxy may fetch from (prevents SSRF).
  // Example: "cdn.your-provider.com,media.your-provider.com"
  mediaHostAllowlist: (process.env.MEDIA_HOST_ALLOWLIST || "")
    .split(",")
    .map(h => h.trim().toLowerCase())
    .filter(Boolean),

  maxDownloadBytes: number("MAX_DOWNLOAD_BYTES", 50 * 1024 * 1024),
  upstreamTimeoutMs: number("UPSTREAM_TIMEOUT_MS", 15_000)
};
