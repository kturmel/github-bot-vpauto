type t

type configOptions = {path: string}

@module("dotenv") external dotenv: t = "default"

@send external config: (t, configOptions) => unit = "config"
