type botConfig = {channelId: option<string>}

type updateError = WriteError(Js.Exn.t)

type readError = ChannelIdNotFound | ParseError(Js.Exn.t) | InvalidConfig

let discordConfig = async () => {
  let configFileBuffer = await Fs.fs->Fs.readFile(Path.path->Path.resolve(Env.configFile()))
  let config = Json.parse(configFileBuffer->Buffer.toString)

  switch config {
  | Ok(config) =>
    switch Js.Json.classify(config) {
    | Js.Json.JSONObject(config) =>
      switch Js.Dict.get(config, "channelId") {
      | Some(channelId) => Ok(channelId)
      | None => Error(ChannelIdNotFound)
      }
    | _ => Error(InvalidConfig)
    }
  | Error(Json.ParseError(ex)) => Error(ParseError(ex))
  }
}

let updateDiscordConfig = async config => {
  try {
    await Fs.fs->Fs.writeFile(Path.path->Path.resolve(Env.configFile()), config->Js.Json.stringify)

    Ok()
  } catch {
  | Js.Exn.Error(ex) => Error(WriteError(ex))
  }
}
