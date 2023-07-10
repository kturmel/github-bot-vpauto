type t

type builder = {
  name: string,
  description: string,
}

type command = {builder: builder}

module Collection = {
  type t<'a>

  @new @module("discord.js") external create: unit => t<'a> = "Collection"

  @send external set: (t<'a>, string, 'a) => t<'a> = "set"
}

@send external execute: (t, Events.Interaction.t) => promise<unit> = "execute"
