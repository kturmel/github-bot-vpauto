import { Collection, Interaction, SlashCommandBuilder } from "discord.js";
import { setupCommand } from "./setup.command.js";

export interface Command {
  builder: SlashCommandBuilder;
  execute: (interaction: Interaction) => Promise<void> | void;
}

const commands = new Collection<string, Command>();

commands.set(setupCommand.builder.name, setupCommand);

export { commands };
