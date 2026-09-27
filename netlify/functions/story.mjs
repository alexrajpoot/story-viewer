// GET /api/story?username=NAME   or   /api/story?url=https://www.instagram.com/stories/NAME/ID/
import { parseStoryQuery } from "../lib/validation.js";
import { getStories } from "../lib/provider.js";
import { json } from "../lib/http.js";

export default async (req) => {
  if (req.method !== "GET") return json({ ok: false, error: "Method not allowed." }, 405);

  const url = new URL(req.url);

  try {
    const { username, storyId } = parseStoryQuery(url.searchParams);
    const result = await getStories({ username, storyId, origin: url.origin });
    return json({ ok: true, ...result });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status === 500) console.error(error);
    return json({ ok: false, error: status === 500 ? "Internal server error." : error.message }, status);
  }
};

export const config = { path: "/api/story" };
