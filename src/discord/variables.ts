import { getEnv } from "../lib/get-env.js";

export const botToken = () => getEnv("BOT_TOKEN");
export const botGuildId = () => getEnv("BOT_GUILD_ID");
export const botAppId = () => getEnv("BOT_APP_ID");

export const botConfigFile = () =>
  getEnv("BOT_CONFIG_FILE", "config/discord-bot.config.json");
