type t

@send external getChannel: (t, string, bool) => option<Channel.t> = "getChannel"
