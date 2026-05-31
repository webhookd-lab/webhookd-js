/** Header names webhookd sets on every forwarded request (public contract). */
export const FORWARD_HEADER = {
  SIGNATURE: "webhookd-signature",
  EVENT_ID: "webhookd-event-id",
  DELIVERY_ID: "webhookd-delivery-id",
  ATTEMPT: "webhookd-attempt",
} as const;

/** Metadata extracted from the webhookd-* headers (the signature aside). */
export interface WebhookMeta {
  signature: string | null;
  eventId: string | null;
  deliveryId: string | null;
  attempt: number | null;
}

/** Accepts a web `Headers` object or a plain header bag (e.g. Node's req.headers). */
export type HeadersInput =
  | Headers
  | Record<string, string | string[] | undefined>;

function read(headers: HeadersInput, name: string): string | null {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const v = (headers as Record<string, string | string[] | undefined>)[name];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Pull the webhookd-* metadata out of a request's headers. */
export function parseMeta(headers: HeadersInput): WebhookMeta {
  const attemptRaw = read(headers, FORWARD_HEADER.ATTEMPT);
  const attempt =
    attemptRaw !== null && /^\d+$/.test(attemptRaw) ? Number(attemptRaw) : null;
  return {
    signature: read(headers, FORWARD_HEADER.SIGNATURE),
    eventId: read(headers, FORWARD_HEADER.EVENT_ID),
    deliveryId: read(headers, FORWARD_HEADER.DELIVERY_ID),
    attempt,
  };
}
