import { Collection, Interaction, SlashCommandBuilder } from "discord.js";
import { setupCommand } from "./setupCommand.js";

export interface Command {
  builder: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void>;
}

const commands = new Collection<string, Command>();

commands.set(setupCommand.builder.name, setupCommand);

export { commands };
