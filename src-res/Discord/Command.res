type t = {
  builder: SlashCommandBuilder.t,
  execute: Interaction.t => promise<unit>,
}
