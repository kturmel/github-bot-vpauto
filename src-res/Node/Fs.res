type t

@module("node:fs/promises") external fs: t = "default"

@send external readFile: (t, string) => promise<Buffer.t> = "readFile"
@send external writeFile: (t, string, string) => promise<unit> = "writeFile"
