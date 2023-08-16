import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  CommandInteractionOption,
} from "discord.js";
import { Command } from "./commands.js";
import { updateDiscordConfig } from "../config.js";

function isGuildTextChannel(
  channel: NonNullable<CommandInteractionOption["channel"]>
): channel is TextChannel {
  return channel.type === ChannelType.GuildText;
}

class CannotReplyError extends Error {}
class CannotUpdateConfigError extends Error {}
class CannotSetupChannelError extends Error {}

/**
 * Set up the bot to a channel.
 *
 * Without this command, the bot will not be able to send messages.
 */
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
  execute: async (interaction) => {
    // this should never occur because Discord itself do the check. But who knows.
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const channel =
      interaction.options.getChannel("channel", true) ?? undefined;

    if (channel === undefined) {
      console.log("new channel to setup is undefined");

      throw new CannotSetupChannelError("new channel to setup is undefined");
    }

    // this should never occur because Discord itself do the check. But who knows.
    const isChannelGuildText = isGuildTextChannel(channel);

    if (!isChannelGuildText) {
      try {
        await interaction.reply({
          content: "Le channel doit être un channel textuel",
          ephemeral: true,
        });
      } catch (err) {
        console.log("cannot reply to channel", err);

        throw new CannotReplyError("cannot reply to channel", { cause: err });
      }

      return undefined;
    }

    /*
     * update the discord config with the new channel
     * this will also save the config to the disk at ./config/discord-bot.config.json
     * then send a message to the user that the bot is now configured
     */
    try {
      await updateDiscordConfig({
        channelId: channel.id,
      });
    } catch (err) {
      throw new CannotUpdateConfigError("cannot update config", { cause: err });
    }

    try {
      await interaction.reply({
        content: `Configuré sur le channel ${channel}`,
      });
    } catch (err) {
      throw new CannotReplyError("cannot reply to interaction", { cause: err });
    }
  },
};
