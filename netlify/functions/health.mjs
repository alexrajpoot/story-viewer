import { config as settings } from "../lib/config.js";
import { json } from "../lib/http.js";

export default async () =>
  json({ ok: true, service: "story-viewer", mode: settings.mode, providerConfigured: Boolean(settings.providerBaseUrl && settings.providerApiKey) });

export const config = { path: "/api/health" };
