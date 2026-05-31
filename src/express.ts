import { parseMeta, type WebhookMeta } from "./headers.js";
import { verify, type VerifyOptions } from "./verify.js";

// Structural types — no runtime dependency on express. Bring your own framework.
interface ReqLike {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
}
interface ResLike {
  status(code: number): ResLike;
  json(body: unknown): unknown;
}
type NextLike = (err?: unknown) => void;

export interface VerifiedRequest extends ReqLike {
  webhook?: { meta: WebhookMeta; timestamp: number; rawBody: Buffer };
}

/**
 * Express middleware. The route MUST receive the raw body as a Buffer — mount
 * `express.raw({ type: "*\/*" })` on the webhook route (NOT a global json parser,
 * which would mangle the signed bytes). On success it attaches `req.webhook` and
 * calls next(); on failure it responds 4xx and stops.
 *
 *   app.post("/webhooks", express.raw({ type: "*\/*" }), webhookd(SECRET), (req, res) => {
 *     const event = JSON.parse(req.body);            // req.body is the verified Buffer
 *     res.json({ ok: true });
 *   });
 */
export function webhookd(secret: string, opts?: VerifyOptions) {
  return (req: VerifiedRequest, res: ResLike, next: NextLike): void => {
    const body = req.body;
    if (!Buffer.isBuffer(body)) {
      res.status(500).json({
        error:
          "webhookd: req.body is not a Buffer — mount express.raw({ type: '*/*' }) on this route",
      });
      return;
    }
    const meta = parseMeta(req.headers);
    if (meta.signature === null) {
      res.status(400).json({ error: "missing webhookd-signature header" });
      return;
    }
    const result = verify(body, meta.signature, secret, opts);
    if (!result.valid) {
      res.status(401).json({ error: "invalid signature", reason: result.reason });
      return;
    }
    req.webhook = { meta, timestamp: result.timestamp, rawBody: body };
    next();
  };
}
