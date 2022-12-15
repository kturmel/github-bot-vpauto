import { User } from "discord.js";
import { discordClient } from "../discord.js";

export type GitHubUsers = "kturmel" | "pierrehenridr" | "vpa-abdel" | "rfathi";

export const gitHubUsers: Record<GitHubUsers, User | null> = {
  kturmel: await discordClient.users.fetch("139136227256434688"),
  pierrehenridr: await discordClient.users.fetch("902105924423020584"),
  "vpa-abdel": await discordClient.users.fetch("139136227256434688"),
  rfathi: await discordClient.users.fetch("786512517618597891"),
};

console.log(gitHubUsers);
