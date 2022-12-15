import fs from "node:fs/promises";
import path from "node:path";

export interface DiscordBotConfig {
  channelId: string | null;
}

export let discordConfig = JSON.parse(
  await fs.readFile(path.resolve("discord-bot.config.json"), "utf-8")
) as DiscordBotConfig;

export async function updateDiscordConfig(config: DiscordBotConfig) {
  await fs.writeFile(
    path.resolve("discord-bot.config.json"),
    JSON.stringify(config)
  );

  discordConfig = config;
}
