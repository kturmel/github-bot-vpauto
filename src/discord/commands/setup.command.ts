import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  CommandInteractionOption,
} from "discord.js";
import { Command } from "./commands.js";
import { discordConfig, updateDiscordConfig } from "../config.js";
import { E, log, O, pipe, TE } from "../../fp-ts.js";

function isGuildTextChannel(
  channel: NonNullable<CommandInteractionOption["channel"]>
): channel is TextChannel {
  return channel.type === ChannelType.GuildText;
}

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

    const channelOpt = O.fromNullable(
      interaction.options.getChannel("channel", true)
    );

    if (O.isNone(channelOpt)) {
      log("channel is none")();

      return;
    }

    // this should never occur because Discord itself do the check. But who knows.
    const isChannelGuildText = isGuildTextChannel(channelOpt.value);

    if (!isChannelGuildText) {
      const replyRes = await TE.tryCatch(
        () =>
          interaction.reply({
            content: "Channel must be a text channel",
            ephemeral: true,
          }),
        (err) => new Error(`cannot reply to interaction. Error given: ${err}`)
      )();

      if (E.isLeft(replyRes)) {
        log(replyRes.left)();
      }

      return;
    }

    const channel = channelOpt.value;

    // update the discord config with the new channel
    // this will also save the config to the disk at ./config/discord-bot.config.json
    // then send a message to the user that the bot is now configured
    const res = await pipe(
      TE.tryCatch(
        () =>
          updateDiscordConfig({
            ...discordConfig,
            channelId: channel.id,
          }),
        (err) => new Error(`cannot update discord config. Error given: ${err}`)
      ),
      TE.chain(() =>
        TE.tryCatch(
          () =>
            interaction.reply({
              content: `Bot configuré sur ${channel}`,
            }),
          (err) => new Error(`cannot reply to interaction. Error given: ${err}`)
        )
      )
    )();

    if (E.isLeft(res)) {
      log(res.left)();
    }
  },
};
