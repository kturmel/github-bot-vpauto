open Discord
open Dotenv

if (
  (Env.isProduction() && Fs.fsSync->Fs.existsSync(".env.production")) ||
    (!Env.isProduction() && Fs.fsSync->Fs.existsSync(".env.local"))
) {
  dotenv->config({
    path: if Env.isProduction() {
      ".env.production"
    } else {
      ".env.local"
    },
  })

  Js.log("loaded .env.*")
}

Js.log({
  "NODE_ENV": Env.getEnv("NODE_ENV", ~defaults="development"),
  "BOT_CONFIG_FILE": Env.getEnv("BOT_CONFIG_FILE"),
})

if Fs.fsSync->Fs.existsSync(".env") {
  dotenv->config({
    path: ".env",
  })

  Js.log("loaded .env")
}

Js.log("starting bot...")
Js.log("login to discord...")

try {
  let _ = await login()
  let _ = handle()

  Js.log("logged on discord")
} catch {
| UnknownCommand => Js.log("unknown command")
| Interaction.CannotReply(_) => Js.log("cannot reply")
| Js.Exn.Error(e) => Js.log("error: " ++ Js.Option.getWithDefault("unknown", Js.Exn.message(e)))
}
