import { parseMeta, type WebhookMeta } from "./headers.js";
import { verify, WebhookVerificationError, type VerifyOptions } from "./verify.js";

export interface VerifiedWebhook {
  /** The verified payload decoded as UTF-8. */
  body: string;
  /** The verified payload as raw bytes (use for non-UTF-8 payloads). */
  rawBody: Uint8Array;
  meta: WebhookMeta;
  timestamp: number;
}

/**
 * Verify a Fetch-API `Request` (Next.js App Router, Hono `c.req.raw`, Bun,
 * Deno, Cloudflare Workers). Reads the raw body itself — do not consume the
 * request body beforehand. Throws {@link WebhookVerificationError} on failure.
 *
 *   export async function POST(req: Request) {
 *     try {
 *       const { body, meta } = await verifyRequest(req, process.env.WEBHOOKD_SECRET!);
 *       const event = JSON.parse(body);
 *       return Response.json({ ok: true });
 *     } catch {
 *       return new Response("invalid signature", { status: 401 });
 *     }
 *   }
 */
export async function verifyRequest(
  req: Request,
  secret: string,
  opts?: VerifyOptions,
): Promise<VerifiedWebhook> {
  const rawBody = new Uint8Array(await req.arrayBuffer());
  const meta = parseMeta(req.headers);
  if (meta.signature === null) {
    throw new WebhookVerificationError("malformed_signature");
  }
  const result = verify(rawBody, meta.signature, secret, opts);
  if (!result.valid) throw new WebhookVerificationError(result.reason);
  return {
    body: new TextDecoder().decode(rawBody),
    rawBody,
    meta,
    timestamp: result.timestamp,
  };
}
