import fs from "node:fs/promises";
import path from "node:path";

export interface DiscordBotConfig {
  channelId: string | null;
}

// no watches are done. If you change the config file, you need to restart the app
export let discordConfig = JSON.parse(
  await fs.readFile(path.resolve("config/discord-bot.config.json"), "utf-8")
) as DiscordBotConfig;

/**
 * Write the config file to disk at config/discord-bot.config.json
 * Then mutate the discordConfig variable
 *
 * @param config - the channel to configure
 */
export async function updateDiscordConfig(config: DiscordBotConfig) {
  await fs.writeFile(
    path.resolve("config/discord-bot.config.json"),
    JSON.stringify(config, undefined, 2)
  );

  discordConfig = config;
}
