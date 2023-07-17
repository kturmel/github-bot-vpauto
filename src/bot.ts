import process from "node:process";
import fs from "node:fs";
import { config } from "dotenv";
import {
  CannotDeployCommandsError,
  CannotLoginError,
  deployCommands,
  handle,
  login,
} from "./discord/discord.js";
import { CannotFetchDiscordUsersError, startServer } from "./github/github.js";
import { retry } from "./exn.js";

if (
  (process.env.NODE_ENV === "production" && fs.existsSync(".env.production")) ||
  (process.env.NODE_ENV !== "production" && fs.existsSync(".env.local"))
) {
  config({
    path:
      process.env.NODE_ENV === "production" ? ".env.production" : ".env.local",
  });

  console.log("using .env.*");
}

if (fs.existsSync(".env")) {
  config({
    path: ".env",
  });

  console.log("using .env");
}

console.log({
  NODE_ENV: process.env.NODE_ENV,
  BOT_CONFIG_FILE: process.env.BOT_CONFIG_FILE,
});

/*
 * Start the discord bot
 * pre-start tasks are:
 * - login to discord
 * - deploy the Discord commands for the bot
 * - start the GitHub WebHook server
 */

console.log("starting bot...");
console.log("login to discord");

try {
  await retry(() => login(), 3);
} catch (err) {
  if (err instanceof CannotLoginError) {
    console.log("cannot login to discord", err);

    process.exit(1);
  }

  throw err;
}

try {
  await retry(() => deployCommands(), 3);
} catch (err) {
  if (err instanceof CannotDeployCommandsError) {
    console.log("cannot deploy commands to discord", err);

    process.exit(1);
  }

  throw err;
}

try {
  await startServer();
} catch (err) {
  if (err instanceof CannotFetchDiscordUsersError) {
    console.error("cannot fetch discord users", err);

    process.exit(1);
  }

  throw err;
}

console.log("the bot is ready!");

await handle();
