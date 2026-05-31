import { expect, test } from "bun:test";

import { parseMeta } from "../src/headers.js";

test("parseMeta reads a web Headers object", () => {
  const h = new Headers({
    "webhookd-signature": "t=1,v1=ab",
    "webhookd-event-id": "evt_1",
    "webhookd-attempt": "2",
  });
  const m = parseMeta(h);
  expect(m.signature).toBe("t=1,v1=ab");
  expect(m.eventId).toBe("evt_1");
  expect(m.attempt).toBe(2);
});

test("parseMeta reads a lowercase plain header bag", () => {
  const m = parseMeta({
    "webhookd-signature": "t=1,v1=ab",
    "webhookd-delivery-id": "del_1",
  });
  expect(m.signature).toBe("t=1,v1=ab");
  expect(m.deliveryId).toBe("del_1");
});

test("parseMeta reads a mixed-case plain header bag (HTTP headers are case-insensitive)", () => {
  const m = parseMeta({
    "Webhookd-Signature": "t=1,v1=ab",
    "WEBHOOKD-EVENT-ID": "evt_9",
  });
  expect(m.signature).toBe("t=1,v1=ab");
  expect(m.eventId).toBe("evt_9");
});

test("parseMeta returns nulls when headers are absent", () => {
  const m = parseMeta({});
  expect(m).toEqual({
    signature: null,
    eventId: null,
    deliveryId: null,
    attempt: null,
  });
});

test("parseMeta leaves attempt null when it is not a number", () => {
  const m = parseMeta({ "webhookd-attempt": "not-a-number" });
  expect(m.attempt).toBeNull();
});
