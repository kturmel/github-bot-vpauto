import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { appId, token } from "./variables.js";
import { commands } from "./commands/commands.js";
import { toExn } from "../exn.js";

export const discordClient = new Client({
  intents: [GatewayIntentBits.GuildMessages],
});

export class CannotLoginError extends Error {}
export class CannotDeployCommandsError extends Error {}
export class CannotExecuteCommandError extends Error {}
export class CannotReplyError extends Error {}
export class UnknownCommandError extends Error {}

/**
 * We need to log in before we can use the client.
 */
export async function login() {
  discordClient.rest = new REST({ version: "10" }).setToken(token());

  try {
    return await discordClient.login(token());
  } catch (err) {
    throw new CannotLoginError("cannot login to discord", {
      cause: err,
    });
  }
}

/**
 * Commands need to be registered before the client is ready.
 */
export async function deployCommands() {
  try {
    await discordClient.rest.put(Routes.applicationCommands(appId()), {
      body: commands.map((command) => command.builder.toJSON()),
    });
  } catch (err) {
    throw new CannotDeployCommandsError("cannot deploy commands to discord", {
      cause: err,
    });
  }
}

/**
 * We listen to any interaction in the discord server.
 *
 * When the user calls a command, we will execute it.
 *
 * @example /vp-setup #my-channel
 */
export function handle() {
  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      console.log("this interaction is not a chat input command");

      return undefined;
    }

    const command = commands.get(interaction.commandName);

    if (command === undefined) {
      throw new UnknownCommandError();
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      const exn = toExn(err);

      console.log(
        "cannot execute command",
        new CannotExecuteCommandError("cannot execute command", { cause: exn })
      );

      try {
        await interaction.reply({ content: exn.message, ephemeral: true });
      } catch (err$1) {
        throw new CannotReplyError("cannot reply to channel", { cause: err$1 });
      }
    }
  });
}
