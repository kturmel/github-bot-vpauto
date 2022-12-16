import { Client, GatewayIntentBits, REST, Routes, Events } from "discord.js";
import { botToken, botAppId, botGuildId } from "./variables.js";
import { commands } from "./commands/commands.js";

const discordClient = new Client({
  intents: [GatewayIntentBits.GuildMessages],
});

const rest = new REST({ version: "10" }).setToken(botToken);

discordClient.rest = rest;

export function login() {
  return discordClient.login(botToken);
}

export async function deployCommands() {
  await rest.put(Routes.applicationGuildCommands(botAppId, botGuildId), {
    body: commands.map((command) => command.builder.toJSON()),
  });
}

export async function handle() {
  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  });
}

export { discordClient };
