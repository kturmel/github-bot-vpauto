exception UnknownCommand
exception CannotReply(Js.Exn.t)

let commands = Commands.commands

let discordClient = Client.create({
  intents: [GatewayIntentBits.GuildMessages],
})

let login = async (): Client.t => {
  switch {
    discordClient.rest = Rest.setToken(
      Rest.create({
        version: "10",
      }),
      Env.token(),
    )
    discordClient->Client.login(Env.token())
  } {
  | client => client
  | exception Js.Exn.Error(e) =>
    switch Js.Exn.message(e) {
    | Some(msg) => Js.Exn.raiseError(`cannot login to discord. Error given: ${msg}`)
    | None => Js.Exn.raiseError("unknown error")
    }
  }
}

let deployCommands = async () => {
  switch await discordClient.rest->Rest.put(
    Routes.routes->Routes.applicationCommands(Env.appId()),
    {
      body: commands->Collection.map(command => command.builder->SlashCommandBuilder.toJSON),
    },
  ) {
  | _ => Js.log("commands deployed")
  | exception Js.Exn.Error(e) =>
    switch Js.Exn.message(e) {
    | Some(msg) => Js.Exn.raiseError(`cannot deploy commands to discord. Error given: ${msg}`)
    | None => Js.Exn.raiseError("unknown error")
    }
  }
}

let handle = () => {
  discordClient->Client.on(Events.InteractionCreate, async interaction => {
    if interaction->Events.Interaction.isChatInputCommand {
      let command = commands->Collection.get(interaction.commandName)

      switch command {
      | Some(command) =>
        switch await command.execute(interaction) {
        | _ => Js.log("command executed")
        | exception Js.Exn.Error(e) =>
          switch await interaction->Events.Interaction.reply({
            content: Js.Option.getWithDefault("unknown error", Js.Exn.message(e)),
            ephemeral: true,
          }) {
          | _ => Js.log("error replied")
          | exception Js.Exn.Error(e) => raise(CannotReply(e))
          }
        }
      | None => raise(UnknownCommand)
      }
    }
  })
}
