exception EnvNotDefined(string)

let getEnv = (key: string, ~defaults=?) => {
  let valueFromEnv = Process.process->Process.env->Js.Dict.get(key)

  switch valueFromEnv {
  | Some(value) => value
  | None =>
    switch defaults {
    | None => raise(EnvNotDefined(key))
    | Some(defaultValue) => defaultValue
    }
  }
}

let token = () => getEnv("BOT_TOKEN")

let guildId = () => getEnv("BOT_GUILD_ID")

let appId = () => getEnv("BOT_APP_ID")

let configFile = () => getEnv("BOT_CONFIG_FILE", ~defaults="config/discord-bot.config.json")
