import { createHmac, timingSafeEqual } from "node:crypto";

/** Why verification failed. The outcome to a caller is binary; this aids diagnostics. */
export type VerifyFailReason =
  | "malformed_signature"
  | "timestamp_too_old"
  | "timestamp_in_future"
  | "signature_mismatch";

export type VerifyResult =
  | { valid: true; timestamp: number }
  | { valid: false; reason: VerifyFailReason };

export interface VerifyOptions {
  /** Allowed clock skew in seconds (inclusive boundary). Default 300. */
  toleranceSec?: number;
  /** Reference time in Unix seconds. Defaults to the system clock; inject in tests. */
  now?: number;
}

/** The webhookd-signature-v1 default tolerance window, in seconds. */
export const DEFAULT_TOLERANCE_SEC = 300;

/** Accepted body shapes. Always verified against the RAW bytes — never a re-serialized object. */
export type BodyInput = string | Uint8Array | ArrayBuffer;

function toBuffer(body: BodyInput): Buffer {
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (body instanceof ArrayBuffer) return Buffer.from(new Uint8Array(body));
  return Buffer.from(body);
}

function parseHeader(header: string): { t: number; sig: string } | null {
  const parts = header.split(",");
  if (parts.length !== 2) return null;
  let t: number | null = null;
  let sig: string | null = null;
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i === -1) return null;
    const key = part.slice(0, i);
    const value = part.slice(i + 1);
    if (key === "t") {
      if (!/^-?\d+$/.test(value)) return null;
      t = Number(value);
    } else if (key === "v1") {
      if (value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value))
        return null;
      sig = value;
    }
  }
  if (t === null || sig === null) return null;
  return { t, sig };
}

/**
 * Verify a webhookd-signature header against the raw request body. Pure, no I/O,
 * no throw. See SPEC.md (webhookd-signature-v1).
 *
 * IMPORTANT: `body` must be the exact bytes webhookd sent. Verifying a
 * re-serialized object (e.g. `JSON.stringify(JSON.parse(raw))`) will fail — the
 * bytes differ from what was signed.
 */
export function verify(
  body: BodyInput,
  signatureHeader: string,
  secret: string,
  opts: VerifyOptions = {},
): VerifyResult {
  const parsed = parseHeader(signatureHeader);
  if (!parsed) return { valid: false, reason: "malformed_signature" };

  const tolerance = opts.toleranceSec ?? DEFAULT_TOLERANCE_SEC;
  const now = opts.now ?? Math.floor(Date.now() / 1000);
  if (parsed.t > now + tolerance) return { valid: false, reason: "timestamp_in_future" };
  if (parsed.t < now - tolerance) return { valid: false, reason: "timestamp_too_old" };

  const expected = createHmac("sha256", secret)
    .update(`${parsed.t}.`)
    .update(toBuffer(body))
    .digest();
  const got = Buffer.from(parsed.sig, "hex");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) {
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true, timestamp: parsed.t };
}

/** Thrown by the `*OrThrow` / adapter helpers when verification fails. */
export class WebhookVerificationError extends Error {
  readonly reason: VerifyFailReason;
  constructor(reason: VerifyFailReason) {
    super(`webhookd signature verification failed: ${reason}`);
    this.name = "WebhookVerificationError";
    this.reason = reason;
  }
}

/** Like {@link verify} but throws {@link WebhookVerificationError} on failure. */
export function verifyOrThrow(
  body: BodyInput,
  signatureHeader: string,
  secret: string,
  opts?: VerifyOptions,
): { timestamp: number } {
  const r = verify(body, signatureHeader, secret, opts);
  if (!r.valid) throw new WebhookVerificationError(r.reason);
  return { timestamp: r.timestamp };
}
