type t

module Hmac = {
  type t

  @send external update: (t, string) => t = "update"
  @send external digest: (t, string) => string = "digest"
}

@module("node:crypto") external crypto: t = "default"

@send external createHmac: (t, string, string) => Hmac.t = "createHmac"
@send external timingSafeEqual: (t, Buffer.t, Buffer.t) => bool = "timingSafeEqual"

let timingSafeEqual = (a: Buffer.t, b: Buffer.t) => {
  if a->Buffer.length == b->Buffer.length {
    crypto->timingSafeEqual(a, b)
  } else {
    false
  }
}
