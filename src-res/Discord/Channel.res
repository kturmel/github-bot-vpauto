type t = {\"type": ChannelType.t, id: string}

let isGuildText = (channel: t) => channel.\"type" == ChannelType.GuildText

@send external toString: t => string = "toString"
