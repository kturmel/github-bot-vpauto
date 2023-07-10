type t

@new @module("discord.js") external create: unit => t = "SlashCommandBuilder"

@send external setName: (t, string) => t = "setName"
@send external setDescription: (t, string) => t = "setDescription"
@send external setDefaultPermission: (t, bool) => t = "setDefaultPermission"
