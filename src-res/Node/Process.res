type t

@module("node:process") external process: t = "default"

@get external env: t => Js.Dict.t<string> = "env"
