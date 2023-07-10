type t

@send external setName: (t, string) => t = "setName"
@send external setDescription: (t, string) => t = "setDescription"
@send
external addChannelTypes: (t, ChannelType.t) => t = "addChannelTypes"
@send
external setRequired: (t, bool) => t = "setRequired"
