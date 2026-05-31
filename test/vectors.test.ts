import { expect, test } from "bun:test";

import { verify } from "../src/verify.js";
import doc from "./vectors.v1.json" with { type: "json" };

// Conformance against the language-neutral suite from webhookd-spec. This is the
// contract every webhookd SDK must satisfy; keep vectors.v1.json in sync with
// the spec repo (vendored copy).
type Vector = {
  name: string;
  secret: string;
  body_utf8?: string;
  body_base64?: string;
  signature_header: string;
  now: number;
  tolerance_sec: number;
  expected: { valid: boolean; reason?: string };
};

for (const v of (doc as { vectors: Vector[] }).vectors) {
  test(`vector: ${v.name}`, () => {
    const body =
      v.body_base64 !== undefined
        ? Buffer.from(v.body_base64, "base64")
        : Buffer.from(v.body_utf8 ?? "", "utf8");
    const r = verify(body, v.signature_header, v.secret, {
      now: v.now,
      toleranceSec: v.tolerance_sec,
    });
    expect(r.valid).toBe(v.expected.valid);
    if (!r.valid) expect(r.reason).toBe(v.expected.reason as typeof r.reason);
  });
}
