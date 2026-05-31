import { expect, test } from "bun:test";

import {
  DEFAULT_TOLERANCE_SEC,
  verify,
  verifyOrThrow,
  WebhookVerificationError,
} from "../src/verify.js";
import { SECRET, sign } from "./helpers.js";

const T = 1_700_000_000;

test("accepts a valid signature with the system clock when within tolerance", () => {
  const body = '{"a":1}';
  const nowSec = Math.floor(Date.now() / 1000);
  const r = verify(body, sign(body, SECRET, nowSec), SECRET);
  expect(r.valid).toBe(true);
});

test("verifies string, Uint8Array, and ArrayBuffer bodies identically", () => {
  const body = '{"shape":"matters not"}';
  const header = sign(body, SECRET, T);
  const u8 = new TextEncoder().encode(body);
  for (const b of [body, u8, u8.buffer]) {
    expect(verify(b, header, SECRET, { now: T }).valid).toBe(true);
  }
});

test("rejects a tampered body", () => {
  const header = sign('{"amount":1}', SECRET, T);
  const r = verify('{"amount":9999}', header, SECRET, { now: T });
  expect(r).toEqual({ valid: false, reason: "signature_mismatch" });
});

test("enforces the default tolerance window of 300s", () => {
  const header = sign("x", SECRET, T);
  expect(verify("x", header, SECRET, { now: T + DEFAULT_TOLERANCE_SEC }).valid).toBe(true);
  expect(verify("x", header, SECRET, { now: T + DEFAULT_TOLERANCE_SEC + 1 })).toEqual({
    valid: false,
    reason: "timestamp_too_old",
  });
});

test("verifyOrThrow throws WebhookVerificationError carrying the reason", () => {
  expect(() => verifyOrThrow("x", "garbage", SECRET, { now: T })).toThrow(
    WebhookVerificationError,
  );
  try {
    verifyOrThrow("x", "garbage", SECRET, { now: T });
  } catch (e) {
    expect((e as WebhookVerificationError).reason).toBe("malformed_signature");
  }
});

test("verifyOrThrow returns the timestamp on success", () => {
  const header = sign("x", SECRET, T);
  expect(verifyOrThrow("x", header, SECRET, { now: T })).toEqual({ timestamp: T });
});
