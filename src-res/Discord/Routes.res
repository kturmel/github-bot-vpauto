type t

@module("discord.js") external routes: t = "Routes"

@send external applicationCommands: (t, Snowflake.snowflake) => string = "applicationCommands"
