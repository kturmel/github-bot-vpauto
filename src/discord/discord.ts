import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { botAppId, botToken } from "./variables.js";
import { commands } from "./commands/commands.js";
import { E, IO, log, O, pipe, TE } from "../fp-ts.js";

const discordClient = new Client({
  intents: [GatewayIntentBits.GuildMessages],
});

/**
 * We need to log in before we can use the client.
 */
export const login = TE.tryCatch(
  async () => {
    discordClient.rest = new REST({ version: "10" }).setToken(botToken());

    return discordClient.login(botToken());
  },
  (e) => new Error(`cannot login to discord. Error given: ${e}`)
);

/**
 * Commands need to be registered before the client is ready.
 */
export const deployCommands = TE.tryCatch(
  () =>
    discordClient.rest.put(Routes.applicationCommands(botAppId()), {
      body: commands.map((command) => command.builder.toJSON()),
    }) as Promise<void>,
  (e) => new Error(`cannot deploy commands to discord. Error given: ${e}`)
);

/**
 * We listen to any interaction in the discord server.
 *
 * When the user calls a command, we will execute it.
 *
 * @example /vp-setup #my-channel
 */
export const handle: IO.IO<void> = () => {
  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = O.fromNullable(commands.get(interaction.commandName));

    if (O.isNone(command)) return;

    const res = await pipe(
      TE.tryCatch(
        () => command.value.execute(interaction),
        (err) =>
          new Error(
            `cannot execute ${interaction.commandName}. Error given: ${err}`
          )
      ),
      TE.orElseW((e) => {
        return TE.tryCatch(
          () => interaction.reply({ content: e.message, ephemeral: true }),
          (err) => new Error(`cannot reply. Error given: ${err}`)
        );
      })
    )();

    if (E.isLeft(res)) {
      log(res.left)();
    }
  });
};

export { discordClient };
