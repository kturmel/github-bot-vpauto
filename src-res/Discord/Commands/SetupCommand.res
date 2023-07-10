open Channel
open Interaction
open InteractionOptions

let setupCommand: Command.t = {
  builder: SlashCommandBuilder.create()
  ->SlashCommandBuilder.setName("vp-setup")
  ->SlashCommandBuilder.setDescription("Configure le bot pour le serveur")
  ->SlashCommandBuilder.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ->SlashCommandBuilder.addChannelOption(option => {
    option
    ->SlashCommandChannelOption.setName("channel")
    ->SlashCommandChannelOption.setDescription(
      "Le channel sur lequel le bot va envoyer les messages",
    )
    ->SlashCommandChannelOption.addChannelTypes(ChannelType.GuildText)
    ->SlashCommandChannelOption.setRequired(true)
  })
  ->SlashCommandBuilder.setDMPermission(false),
  execute: async interaction => {
    if interaction->isChatInputCommand {
      let channel = interaction->options->getChannel("channel", true)

      switch channel {
      | Some(channel) =>
        if !(channel->isGuildText) {
          switch await interaction->reply({
            content: "Le channel n'est pas un channel textuel",
            ephemeral: true,
          }) {
          | _ => ()
          | exception Js.Exn.Error(ex) => raise(Interaction.CannotReply(ex))
          }
        } else {
          let config: Config.t = {
            channelId: Some(channel.id),
          }

          switch await Config.updateDiscordConfig(config) {
          | Ok() => {
              Js.log("updated config")

              switch await interaction->reply({
                content: "Configuré sur le channel " ++ channel->toString,
                ephemeral: true,
              }) {
              | _ => ()
              | exception Js.Exn.Error(ex) => raise(Interaction.CannotReply(ex))
              }
            }
          | Error(WriteError(_)) =>
            switch await interaction->reply({
              content: "Une erreur est survenue lors de la sauvegarde de la configuration",
              ephemeral: true,
            }) {
            | _ => ()
            | exception Js.Exn.Error(ex) => raise(Interaction.CannotReply(ex))
            }
          }
        }
      | None => ()
      }
    }
  },
}
