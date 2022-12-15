import {
  Interaction,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { Command } from "./commands.js";
import { discordConfig, updateDiscordConfig } from "../config.js";

export const setupCommand: Command = {
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

    await updateDiscordConfig({ ...discordConfig, channelId: channel.id });

    interaction.reply({
      content: `Bot configuré sur ${channel}`,
    });
  },
};
