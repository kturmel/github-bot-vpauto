type t = {channelId: option<string>}

type updateError = WriteError(Js.Exn.t)

type readError = ChannelIdNotFound | ParseError(Js.Exn.t) | InvalidConfig | NotAString

let discordConfig = async (): result<t, readError> => {
  let configFileBuffer = await Fs.fs->Fs.readFile(Path.path->Path.resolve(Env.configFile()))
  let config = Json.parse(configFileBuffer->Buffer.toString)

  switch config {
  | Ok(config) =>
    switch Js.Json.classify(config) {
    | Js.Json.JSONObject(config) =>
      switch Js.Dict.get(config, "channelId") {
      | Some(channelId) =>
        switch Js.Json.classify(channelId) {
        | Js.Json.JSONString(channelId) => Ok({channelId: Some(channelId)})
        | _ => Error(NotAString)
        }
      | None => Error(ChannelIdNotFound)
      }
    | _ => Error(InvalidConfig)
    }
  | Error(Json.ParseError(ex)) => Error(ParseError(ex))
  }
}

let updateDiscordConfig = async config => {
  try {
    let asString = config->Js.Json.stringifyAny

    switch asString {
    | Some(config) => await Fs.fs->Fs.writeFile(Path.path->Path.resolve(Env.configFile()), config)
    | None => ()
    }

    Ok()
  } catch {
  | Js.Exn.Error(ex) => Error(WriteError(ex))
  }
}
