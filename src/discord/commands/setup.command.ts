import {
  Interaction,
  CommandInteractionOption,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "./commands.js";

let botChannelId: string | undefined = "1052607428342055012";

const setupCommand: Command = {
  builder: new SlashCommandBuilder()
    .setName("vp-setup")
    .setDescription("Setup the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send the message to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDMPermission(false),
  execute: async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const channel = interaction.options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText) {
      interaction.reply({
        content: "Channel must be a text channel",
        ephemeral: true,
      });

      return;
    }

    botChannelId = channel.id;

    interaction.reply({
      content: "Setup command executed!",
    });
  },
};

export { botChannelId, setupCommand };
