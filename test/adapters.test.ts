import { expect, test } from "bun:test";

import { webhookd as expressWebhookd, type VerifiedRequest } from "../src/express.js";
import { verifyRequest } from "../src/fetch.js";
import { WebhookVerificationError } from "../src/verify.js";
import { SECRET, sign, signedRequest } from "./helpers.js";

const T = 1_700_000_000;
const opts = { now: T };

// ── fetch adapter ───────────────────────────────────────────────────────────

test("fetch: verifies a signed Request and returns body + meta", async () => {
  const body = '{"id":"evt_1"}';
  const res = await verifyRequest(signedRequest(body, { t: T }), SECRET, opts);
  expect(res.body).toBe(body);
  expect(res.meta.eventId).toBe("evt_test");
  expect(res.meta.attempt).toBe(1);
  expect(res.timestamp).toBe(T);
});

test("fetch: throws on a tampered body", async () => {
  const req = new Request("https://app.example/webhooks", {
    method: "POST",
    headers: { "webhookd-signature": sign('{"x":1}', SECRET, T) },
    body: '{"x":2}',
  });
  await expect(verifyRequest(req, SECRET, opts)).rejects.toBeInstanceOf(
    WebhookVerificationError,
  );
});

test("fetch: throws when the signature header is missing", async () => {
  const req = new Request("https://app.example/webhooks", { method: "POST", body: "{}" });
  await expect(verifyRequest(req, SECRET, opts)).rejects.toBeInstanceOf(
    WebhookVerificationError,
  );
});

// ── express adapter ─────────────────────────────────────────────────────────

function mockRes() {
  const out: { code: number; body: unknown } = { code: 0, body: undefined };
  const res = {
    status(code: number) {
      out.code = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    },
  };
  return { res, out };
}

test("express: calls next and attaches req.webhook on a valid signature", () => {
  const body = '{"id":"evt_1"}';
  const req: VerifiedRequest = {
    body: Buffer.from(body),
    headers: { "webhookd-signature": sign(body, SECRET, T), "webhookd-event-id": "evt_1" },
  };
  const { res, out } = mockRes();
  let nexted = false;
  expressWebhookd(SECRET, opts)(req, res, () => {
    nexted = true;
  });
  expect(nexted).toBe(true);
  expect(out.code).toBe(0);
  expect(req.webhook?.meta.eventId).toBe("evt_1");
  expect(req.webhook?.timestamp).toBe(T);
});

test("express: 401s an invalid signature without calling next", () => {
  const req: VerifiedRequest = {
    body: Buffer.from('{"x":2}'),
    headers: { "webhookd-signature": sign('{"x":1}', SECRET, T) },
  };
  const { res, out } = mockRes();
  let nexted = false;
  expressWebhookd(SECRET, opts)(req, res, () => {
    nexted = true;
  });
  expect(nexted).toBe(false);
  expect(out.code).toBe(401);
});

test("express: 500s when the body is not a raw Buffer", () => {
  const req: VerifiedRequest = {
    body: { parsed: true },
    headers: { "webhookd-signature": sign("{}", SECRET, T) },
  };
  const { res, out } = mockRes();
  expressWebhookd(SECRET, opts)(req, res, () => {});
  expect(out.code).toBe(500);
});
