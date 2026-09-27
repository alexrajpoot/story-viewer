// Local preview without the Netlify CLI:  node dev-server.mjs  → http://localhost:8888
// Serves public/ and routes /api/* to the same function files Netlify runs.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import story from "./netlify/functions/story.mjs";
import download from "./netlify/functions/download.mjs";
import health from "./netlify/functions/health.mjs";

const routes = { "/api/story": story, "/api/download": download, "/api/health": health };
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
const port = Number(process.env.PORT) || 8888;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const fn = routes[url.pathname];
  if (fn) {
    const response = await fn(new Request(url, { method: req.method }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  const path = normalize(join("public", url.pathname === "/" ? "index.html" : url.pathname));
  if (!path.startsWith("public")) return res.writeHead(403).end();
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
