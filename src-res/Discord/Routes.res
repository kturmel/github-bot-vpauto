type t

@module("discord.js") external routes: t = "Routes"

@send external applicationCommands: (t, Snowflake.t) => string = "applicationCommands"
