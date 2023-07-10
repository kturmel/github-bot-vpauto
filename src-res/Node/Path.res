type t

@module("node:path") external path: t = "default"

@send external resolve: (t, string) => string = "resolve"
