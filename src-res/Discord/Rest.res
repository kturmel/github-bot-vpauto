type t

type createOptions = {version: string}

type requestOptions = {body: string}

@new @module("discord.js") external create: createOptions => t = "REST"

@send external post: (t, string) => string = "post"
@send external patch: (t, string) => string = "patch"
@send external put: (t, string) => string = "put"
@send external delete: (t, string) => string = "delete"
@send external setToken: (t, string) => t = "setToken"
