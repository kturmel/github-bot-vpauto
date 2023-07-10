type t = {commandName: string, options: InteractionOptions.t}

type reply = {
  content: string,
  ephemeral: bool,
}

exception CannotReply(Js.Exn.t)

@new @module("discord.js") external create: unit => t = "Interaction"

@send external isChatInputCommand: t => bool = "isChatInputCommand"
@send external reply: (t, reply) => promise<unit> = "reply"
@get external options: t => InteractionOptions.t = "options"
