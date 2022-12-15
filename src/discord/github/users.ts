import { User } from "discord.js";
import { discordClient } from "../discord.js";

export type GitHubUsers = "kturmel" | "pierrehenridr";

export const gitHubUsers: Record<GitHubUsers, User> = {
  kturmel: await discordClient.users.fetch("139136227256434688"),
  pierrehenridr: await discordClient.users.fetch("902105924423020584"),
};

console.log(gitHubUsers);
