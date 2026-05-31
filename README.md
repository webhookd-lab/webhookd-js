# webhookd

Verify [webhookd](https://webhookd.dev) webhook signatures. Stripe-compatible
HMAC, **zero runtime dependencies**, with adapters for Next.js, Express, and Hono.

```sh
npm i webhookd
```

## Why

When webhookd forwards a webhook to your endpoint, it signs the request with your
endpoint's outbound secret. Verifying that signature proves the request really
came from webhookd and wasn't tampered with. The scheme is the same one Stripe
uses, so if you've verified Stripe webhooks before, this will feel familiar.

The one rule: **verify against the raw request body**, before any JSON parsing.
Re-serializing the body changes its bytes and the signature won't match. The
adapters below handle this for you.

## Core API

```ts
import { verify } from "webhookd";

const result = verify(rawBody, signatureHeader, secret);
// rawBody: string | Uint8Array | ArrayBuffer (the exact bytes received)
// signatureHeader: the "webhookd-signature" header value
// secret: your endpoint's outbound secret (whsec_out_…)

if (result.valid) {
  // result.timestamp — when webhookd signed it (Unix seconds)
} else {
  // result.reason — "malformed_signature" | "timestamp_too_old"
  //               | "timestamp_in_future" | "signature_mismatch"
}
```

Prefer exceptions? `verifyOrThrow(body, sig, secret)` throws
`WebhookVerificationError` (with `.reason`) instead of returning a result.

Options: `{ toleranceSec = 300, now }` — `toleranceSec` is the allowed clock skew;
`now` (Unix seconds) is injectable for testing.

## Framework adapters

Each adapter reads the raw body correctly and exposes the verified metadata
(`webhookd-event-id`, `-delivery-id`, `-attempt`). They have **no runtime
dependency** on the framework — bring your own.

### Next.js (App Router) / any Fetch runtime

```ts
import { verifyRequest } from "webhookd/fetch";

export async function POST(req: Request) {
  try {
    const { body, meta } = await verifyRequest(req, process.env.WEBHOOKD_SECRET!);
    const event = JSON.parse(body);
    // … handle event; meta.eventId is handy for idempotency
    return Response.json({ ok: true });
  } catch {
    return new Response("invalid signature", { status: 401 });
  }
}
```

Works anywhere `Request` exists: Next.js, Bun, Deno, Cloudflare Workers, or
Hono via `verifyRequest(c.req.raw, secret)`.

### Express

Mount `express.raw()` on the webhook route so the body stays a Buffer — do **not**
use a global JSON parser, it would mangle the signed bytes.

```ts
import express from "express";
import { webhookd } from "webhookd/express";

app.post(
  "/webhooks",
  express.raw({ type: "*/*" }),
  webhookd(process.env.WEBHOOKD_SECRET!),
  (req, res) => {
    const event = JSON.parse(req.body);   // req.body is the verified Buffer
    const { meta } = req.webhook!;          // typed: eventId, deliveryId, attempt
    res.json({ ok: true });
  },
);
```

On an invalid signature the middleware responds `401` and never calls your
handler.

### Hono

```ts
import { Hono } from "hono";
import { webhookd } from "webhookd/hono";

const app = new Hono();

app.post("/webhooks", webhookd(process.env.WEBHOOKD_SECRET!), (c) => {
  const { body, meta } = c.get("webhook");
  return c.json({ ok: true });
});
```

## Headers webhookd sends

| Header                 | Use                                       |
| ---------------------- | ----------------------------------------- |
| `webhookd-signature`   | What you verify.                          |
| `webhookd-event-id`    | Dedupe on your side.                      |
| `webhookd-delivery-id` | Correlate with the dashboard / support.   |
| `webhookd-attempt`     | Attempt number (`1` first try).           |

`import { parseMeta } from "webhookd"` extracts these from a `Headers` object or
a plain header bag.

## Spec & conformance

The signing scheme and language-neutral test vectors live in
[webhookd-spec](https://github.com/webhookd-lab/webhookd-spec). This package is
tested directly against those vectors.

## License

MIT
