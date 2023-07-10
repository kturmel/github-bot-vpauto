type t

type createOptions = {version: string}

type requestOptions<'a> = {body: 'a}

@new @module("discord.js") external create: createOptions => t = "REST"

@send external put: (t, string, requestOptions<'a>) => promise<unit> = "put"
@send external setToken: (t, string) => t = "setToken"
