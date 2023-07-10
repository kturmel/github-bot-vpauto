type t

let discordClient = Client.create({
  intents: [GatewayIntentBits.GuildMessages],
})

let login = async (): Client.t => {
  try {
    let rest = Rest.create({
      version: "10",
    })

    discordClient.rest = rest->Rest.setToken("TODO")
    discordClient->Client.login("TODO")
  } catch {
  | Js.Exn.Error(e) =>
    switch Js.Exn.message(e) {
    | Some(msg) => Js.Exn.raiseError(`cannot login to discord. Error given: ${msg}`)
    | None => Js.Exn.raiseError("unknown error")
    }
  }
}

let handle = () => {
  discordClient->Client.on(Events.InteractionCreate, async interaction => {
    if interaction->Events.Interaction.isChatInputCommand {
      Js.log("TODO")

      let command = interaction.commandName

      // TODO: check for commands.get option<command>
    }
  })
}

let deployCommands = async () => {
  discordClient.rest->Rest.put(Routes.routes->Routes.applicationCommands("TODO"))
}
