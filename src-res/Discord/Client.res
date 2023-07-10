type t = {mutable rest: Rest.t}
type createOptions = {intents: array<GatewayIntentBits.t>}

@new @module("discord.js") external create: createOptions => t = "Client"

@send external login: (t, string) => t = "login"
@send external on: (t, Events.t, Events.Interaction.t => promise<unit>) => t = "on"
