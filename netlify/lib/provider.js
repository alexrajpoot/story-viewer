import { config } from "./config.js";

export class ProviderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

/**
 * Returns stories in this normalized shape:
 * { username, stories: [{ id, type: "image"|"video", thumbnailUrl, mediaUrl, timestamp }] }
 *
 * `origin` is the site's own URL (e.g. https://your-site.netlify.app), used for demo media.
 */
export async function getStories({ username, storyId, origin }) {
  if (config.mode === "demo") return demoStories(username, storyId, origin);

  if (!config.providerBaseUrl || !config.providerApiKey) {
    throw new ProviderError(
      "Provider is not configured. Set PROVIDER_BASE_URL and PROVIDER_API_KEY in Netlify, or set STORY_MODE=demo.",
      503
    );
  }

  const base = config.providerBaseUrl.endsWith("/") ? config.providerBaseUrl : config.providerBaseUrl + "/";
  const endpoint = new URL("story", base);
  endpoint.searchParams.set("username", username);
  if (storyId) endpoint.searchParams.set("storyId", storyId);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json", [config.providerApiKeyHeader]: config.providerApiKey },
      signal: controller.signal
    });

    if (response.status === 404) throw new ProviderError("Public story media was not found.", 404);
    if (!response.ok) throw new ProviderError(`Upstream provider returned HTTP ${response.status}.`, 502);

    return normalizeResponse(await response.json(), username);
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error.name === "AbortError") throw new ProviderError("Upstream provider timed out.", 504);
    throw new ProviderError("Unable to reach the upstream provider.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

// Change this to map YOUR provider's JSON into the normalized shape above.
function normalizeResponse(body, requestedUsername) {
  const stories = Array.isArray(body?.stories) ? body.stories : [];
  return {
    username: body?.username || requestedUsername,
    stories: stories
      .map((story, index) => ({
        id: String(story.id ?? index),
        type: story.type === "video" ? "video" : "image",
        thumbnailUrl: validHttpUrl(story.thumbnailUrl),
        mediaUrl: validHttpUrl(story.mediaUrl),
        timestamp: story.timestamp || null
      }))
      .filter(story => story.mediaUrl)
  };
}

function validHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// ---- Demo mode: sample stories served from /demo on this same site ----
function demoStories(username, storyId, origin) {
  const now = Date.now();
  const stories = [1, 2, 3, 4].map(n => {
    const url = new URL(`/demo/story-${n}.svg`, origin).toString();
    return {
      id: `demo-${n}`,
      type: "image",
      thumbnailUrl: url,
      mediaUrl: url,
      timestamp: new Date(now - n * 3 * 60 * 60 * 1000).toISOString()
    };
  });
  return {
    username,
    demo: true,
    stories: storyId ? stories.filter(s => s.id === storyId).concat(stories).slice(0, 1) : stories
  };
}
