import { createHmac } from "node:crypto";

import { FORWARD_HEADER } from "../src/headers.js";

export const SECRET = "whsec_out_testtesttesttest";

/** Produce a valid webhookd-signature header for `body` at time `t`. */
export function sign(body: string, secret = SECRET, t = 1_700_000_000): string {
  const sig = createHmac("sha256", secret)
    .update(`${t}.`)
    .update(Buffer.from(body, "utf8"))
    .digest("hex");
  return `t=${t},v1=${sig}`;
}

/** Build a Fetch Request carrying a signed webhookd delivery. */
export function signedRequest(
  body: string,
  opts: { secret?: string; t?: number; meta?: Record<string, string> } = {},
): Request {
  const headers = new Headers({
    [FORWARD_HEADER.SIGNATURE]: sign(body, opts.secret ?? SECRET, opts.t),
    [FORWARD_HEADER.EVENT_ID]: "evt_test",
    [FORWARD_HEADER.DELIVERY_ID]: "del_test",
    [FORWARD_HEADER.ATTEMPT]: "1",
    ...(opts.meta ?? {}),
  });
  return new Request("https://app.example/webhooks", {
    method: "POST",
    headers,
    body,
  });
}
