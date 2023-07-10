type t = | @as("interactionCreate") InteractionCreate

module Interaction = {
  type t = {commandName: string}

  type reply = {
    content: string,
    ephemeral: bool,
  }

  @new @module("discord.js") external create: unit => t = "Interaction"

  @send external isChatInputCommand: t => bool = "isChatInputCommand"
  @send external reply: (t, reply) => promise<unit> = "reply"
}
