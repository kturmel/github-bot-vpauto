import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { gitHubSecret } from "./variables.js";

/**
 * Verify the signature of a webhook payload.
 *
 * @param payload
 * @param signature - the signature to verify
 */
export function verifySignature(payload: string, signature: string) {
  const hmac = crypto.createHmac("sha256", gitHubSecret());
  const digest = Buffer.from(
    `sha256=${hmac.update(payload).digest("hex")}`,
    "utf8"
  );
  const checksum = Buffer.from(signature, "utf8");

  return (
    checksum.length === digest.length &&
    crypto.timingSafeEqual(digest, checksum)
  );
}
