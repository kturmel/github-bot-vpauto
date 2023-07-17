open Crypto

let verifySignature = (signature, secret, payload) => {
  let hmac = crypto->createHmac("sha256", secret)
  let sha256 = hmac->Hmac.update(payload)->Hmac.digest("hex")
  let digest = Buffer.buffer->Buffer.from(`sha256=${sha256}`, "utf8")
  let checksum = Buffer.buffer->Buffer.from(signature, "utf8")

  timingSafeEqual(digest, checksum) && digest->Buffer.length == checksum->Buffer.length
}
