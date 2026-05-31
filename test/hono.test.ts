import { expect, test } from "bun:test";
import { Hono } from "hono";

import { webhookd } from "../src/hono.js";
import type { HonoWebhook } from "../src/hono.js";
import { SECRET, sign } from "./helpers.js";

const T = 1_700_000_000;

function app() {
  const h = new Hono<{ Variables: { webhook: HonoWebhook } }>();
  h.post("/webhooks", webhookd(SECRET, { now: T }), (c) => {
    const w = c.get("webhook");
    return c.json({ ok: true, eventId: w.meta.eventId, body: w.body });
  });
  return h;
}

test("hono: passes a valid signature through to the handler", async () => {
  const body = '{"id":"evt_1"}';
  const res = await app().request("/webhooks", {
    method: "POST",
    headers: { "webhookd-signature": sign(body, SECRET, T), "webhookd-event-id": "evt_1" },
    body,
  });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, eventId: "evt_1", body });
});

test("hono: 401s an invalid signature", async () => {
  const res = await app().request("/webhooks", {
    method: "POST",
    headers: { "webhookd-signature": sign('{"x":1}', SECRET, T) },
    body: '{"x":2}',
  });
  expect(res.status).toBe(401);
});
