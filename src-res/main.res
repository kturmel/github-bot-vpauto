open Discord

Js.log("starting bot...")
Js.log("login to discord...")

try {
  let _ = await login()
  let _ = handle()
} catch {
| UnknownCommand => Js.log("unknown command")
| CannotReply(_) => Js.log("cannot reply")
| Js.Exn.Error(e) => Js.log("error: " ++ Js.Option.getWithDefault("unknown", Js.Exn.message(e)))
}
