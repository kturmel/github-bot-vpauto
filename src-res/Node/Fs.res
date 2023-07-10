type t
type tSync

@module("node:fs/promises") external fs: t = "default"
@module("node:fs") external fsSync: tSync = "default"

@send external readFile: (t, string) => promise<Buffer.t> = "readFile"
@send external writeFile: (t, string, string) => promise<unit> = "writeFile"

@send external existsSync: (tSync, string) => bool = "existsSync"
