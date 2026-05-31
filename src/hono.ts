import { parseMeta, type WebhookMeta } from "./headers.js";
import { verify, type VerifyOptions } from "./verify.js";

// Structural types — no runtime dependency on hono. Compatible with a real
// Hono Context (it has req.raw, set, json).
interface ContextLike {
  req: { raw: Request };
  set(key: string, value: unknown): void;
  json(object: unknown, status?: number): Response;
}
type NextLike = () => Promise<void>;

export interface HonoWebhook {
  meta: WebhookMeta;
  timestamp: number;
  body: string;
}

/**
 * Hono middleware. Verifies `c.req.raw` and, on success, stores the verified
 * payload under `c.get("webhook")` before calling next(); on failure responds
 * 4xx and stops.
 *
 *   app.post("/webhooks", webhookd(SECRET), (c) => {
 *     const { body, meta } = c.get("webhook");
 *     return c.json({ ok: true });
 *   });
 */
export function webhookd(secret: string, opts?: VerifyOptions) {
  return async (c: ContextLike, next: NextLike): Promise<Response | void> => {
    const rawBody = new Uint8Array(await c.req.raw.arrayBuffer());
    const meta = parseMeta(c.req.raw.headers);
    if (meta.signature === null) {
      return c.json({ error: "missing webhookd-signature header" }, 400);
    }
    const result = verify(rawBody, meta.signature, secret, opts);
    if (!result.valid) {
      return c.json({ error: "invalid signature", reason: result.reason }, 401);
    }
    const verified: HonoWebhook = {
      meta,
      timestamp: result.timestamp,
      body: new TextDecoder().decode(rawBody),
    };
    c.set("webhook", verified);
    await next();
  };
}
