import fs from "node:fs/promises";
import path from "node:path";

export interface DiscordBotConfig {
  channelId: string | null;
}

export const discordConfig = JSON.parse(
  await fs.readFile(path.resolve("discord-bot.config.json"), "utf-8")
) as DiscordBotConfig;
