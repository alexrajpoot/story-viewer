export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputError";
    this.status = 400;
  }
}

const USERNAME_RE = /^[A-Za-z0-9._]{1,30}$/;

/**
 * Accepts one of:
 *   ?username=name | @name | https://www.instagram.com/name/
 *   ?url=https://www.instagram.com/stories/name/1234567890/
 * Returns { username, storyId? }.
 */
export function parseStoryQuery(params) {
  const username = (params.get("username") || "").trim();
  const url = (params.get("url") || "").trim();

  if (Boolean(username) === Boolean(url)) {
    throw new InputError("Enter a username or a story link.");
  }
  if (url) return parseInstagramUrl(url);

  if (/instagram\.com/i.test(username)) return parseInstagramUrl(username);

  const clean = username.replace(/^@/, "");
  if (!USERNAME_RE.test(clean)) throw new InputError("That doesn't look like a valid Instagram username.");
  return { username: clean };
}

function parseInstagramUrl(value) {
  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new InputError("That link isn't a valid URL.");
  }
  if (!["instagram.com", "www.instagram.com"].includes(parsed.hostname.toLowerCase())) {
    throw new InputError("The link must be an instagram.com link.");
  }

  const parts = parsed.pathname.split("/").filter(Boolean);

  // /stories/<username>/<storyId>/
  if (parts[0]?.toLowerCase() === "stories") {
    const [, username, storyId] = parts;
    if (!USERNAME_RE.test(username || "")) throw new InputError("Invalid Instagram username in link.");
    if (storyId && !/^[A-Za-z0-9_-]{1,200}$/.test(storyId)) throw new InputError("Invalid story ID in link.");
    return { username, storyId };
  }

  // /<username>/
  if (parts.length >= 1 && USERNAME_RE.test(parts[0])) return { username: parts[0] };

  throw new InputError("Couldn't find a username in that link.");
}
