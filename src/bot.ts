import { deployCommands, handle, login } from "./discord/discord.js";
import { startGitHubServer } from "./github/github.js";

console.log("Starting bot...");
console.log("Login");
await login();
console.log("Deploy Commands");
await deployCommands();
console.log("Start GitHub Server");
await startGitHubServer();
console.log("Ready!");
await handle();
