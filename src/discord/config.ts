import fs from "node:fs/promises";
import path from "node:path";

export interface DiscordBotConfig {
  channelId: string | null;
}

export let discordConfig = JSON.parse(
  await fs.readFile(path.resolve("config/discord-bot.config.json"), "utf-8")
) as DiscordBotConfig;

export async function updateDiscordConfig(config: DiscordBotConfig) {
  await fs.writeFile(
    path.resolve("config/discord-bot.config.json"),
    JSON.stringify(config, undefined, 2)
  );

  discordConfig = config;
}
