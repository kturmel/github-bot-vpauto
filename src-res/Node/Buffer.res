type t

@module("node:buffer") external buffer: t = "Buffer"

@send external toString: t => string = "toString"
@send external from: (t, string, string) => t = "from"
@get external length: t => int = "length"
