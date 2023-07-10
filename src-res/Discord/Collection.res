type t<'a, 'b>

@new @module("discord.js") external create: unit => t<'a, 'b> = "Collection"

@send external set: (t<'a, 'b>, 'a, 'b) => t<'a, 'b> = "set"
@send external map: (t<'a, 'b>, 'b => 'c) => array<'c> = "map"
@send external get: (t<'a, 'b>, 'a) => option<'b> = "get"
