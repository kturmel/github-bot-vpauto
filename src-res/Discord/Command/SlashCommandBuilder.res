type t = {
  name: string,
  description: string,
}

@new @module("discord.js") external create: unit => t = "SlashCommandBuilder"

@send external setName: (t, string) => t = "setName"
@send external setDescription: (t, string) => t = "setDescription"
@send
external setDefaultMemberPermissions: (t, PermissionFlagsBits.t) => t =
  "setDefaultMemberPermissions"
@send
external addChannelOption: (t, SlashCommandChannelOption.t => SlashCommandChannelOption.t) => t =
  "addChannelOption"
@send
external setDMPermission: (t, bool) => t = "setDMPermission"

@send external toJSON: t => Js.Json.t = "toJSON"
