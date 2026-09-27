// GET /api/download?mediaUrl=https://...
// Streams the media back with a "Save as" header. Only allowlisted hosts are fetched (SSRF protection).
import { config as settings } from "../lib/config.js";
import { json } from "../lib/http.js";

const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm"
};

export default async (req) => {
  const self = new URL(req.url);
  const raw = self.searchParams.get("mediaUrl")?.trim();
  if (!raw) return json({ ok: false, error: "mediaUrl is required." }, 400);

  let target;
  try {
    target = new URL(raw);
  } catch {
    return json({ ok: false, error: "mediaUrl is not a valid URL." }, 400);
  }
  if (target.protocol !== "https:" && !(target.protocol === "http:" && target.hostname === "localhost")) {
    return json({ ok: false, error: "Only HTTPS media URLs are supported." }, 400);
  }

  const host = target.hostname.toLowerCase();
  const allowed = host === self.hostname.toLowerCase() || settings.mediaHostAllowlist.includes(host);
  if (!allowed) return json({ ok: false, error: "This media host is not allowed." }, 403);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), settings.upstreamTimeoutMs);

  try {
    const upstream = await fetch(target, { signal: controller.signal, redirect: "error" });
    if (!upstream.ok || !upstream.body) return json({ ok: false, error: "Media is unavailable." }, 404);

    const length = Number(upstream.headers.get("content-length") || 0);
    if (length > settings.maxDownloadBytes) return json({ ok: false, error: "Media file is too large." }, 413);

    const type = upstream.headers.get("content-type") || "application/octet-stream";
    const ext = EXT[type.split(";")[0].trim().toLowerCase()] || "bin";

    // Enforce the size limit while streaming.
    let total = 0;
    const limiter = new TransformStream({
      transform(chunk, ctrl) {
        total += chunk.byteLength;
        if (total > settings.maxDownloadBytes) ctrl.error(new Error("Too large"));
        else ctrl.enqueue(chunk);
      }
    });

    return new Response(upstream.body.pipeThrough(limiter), {
      headers: {
        "content-type": type,
        "content-disposition": `attachment; filename="story.${ext}"`,
        "cache-control": "private, no-store"
      }
    });
  } catch (error) {
    if (error.name === "AbortError") return json({ ok: false, error: "Media request timed out." }, 504);
    return json({ ok: false, error: "Could not fetch media." }, 502);
  } finally {
    clearTimeout(timeout);
  }
};

export const config = { path: "/api/download" };
