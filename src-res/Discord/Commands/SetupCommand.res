let setupCommand: Command.t = {
  builder: SlashCommandBuilder.create()
  ->SlashCommandBuilder.setName("vp-setup")
  ->SlashCommandBuilder.setDescription("Setup the bot")
  ->SlashCommandBuilder.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  ->SlashCommandBuilder.addChannelOption(option => {
    option
    ->SlashCommandChannelOption.setName("channel")
    ->SlashCommandChannelOption.setDescription("The channel to send the messages to")
    ->SlashCommandChannelOption.addChannelTypes(ChannelType.GuildText)
    ->SlashCommandChannelOption.setRequired(true)
  })
  ->SlashCommandBuilder.setDMPermission(false),
  execute: async interaction => {
    Js.log(interaction)

    // TODO: handle this
  },
}
