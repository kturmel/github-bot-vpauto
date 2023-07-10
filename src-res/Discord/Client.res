type t = {mutable rest: Rest.t}
type createOptions = {intents: array<GatewayIntentBits.t>}

@new @module("discord.js") external create: createOptions => t = "Client"

@send external login: (t, string) => promise<t> = "login"
@send external on: (t, Events.t, Interaction.t => promise<unit>) => t = "on"
