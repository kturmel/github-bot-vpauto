import { User } from "discord.js";
import { discordClient } from "../discord.js";

export type GitHubUsernames =
  | "kturmel"
  | "pierrehenridr"
  | "vpa-abdel"
  | "rfathi";
export type GitHubUsers = Record<GitHubUsernames, User | undefined>;

/**
 * A map of the users from the discord server.
 *
 * The key is the GitHub username and the value is the Discord user.
 */
export let githubUsers: GitHubUsers;

/**
 * Set the map of the users in {@link githubUsers}
 */
export async function setDiscordUsersFromGitHubUsers() {
  githubUsers = {
    kturmel: await discordClient.users.fetch("139136227256434688"),
    pierrehenridr: await discordClient.users.fetch("902105924423020584"),
    "vpa-abdel": await discordClient.users.fetch("920903211240550441"),
    rfathi: await discordClient.users.fetch("786512517618597891"),
  };
}
