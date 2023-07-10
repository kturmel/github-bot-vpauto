type t

let commands: Collection.t<string, Command.t> =
  Collection.create()->Collection.set(
    SetupCommand.setupCommand.builder.name,
    SetupCommand.setupCommand,
  )
