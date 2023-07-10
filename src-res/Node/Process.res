type t

@module("node:process") external process: t = "default"

@send external env: t => Js.Dict.t<string> = "env"
