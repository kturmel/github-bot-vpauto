type t = {
  builder: SlashCommandBuilder.t,
  execute: Events.Interaction.t => promise<unit>,
}
