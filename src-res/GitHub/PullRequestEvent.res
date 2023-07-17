open RescriptStruct

type t = {\"type": string, draft: bool}

let tStruct: S.t<t> = S.object(o => {
  \"type": o->S.field("type", S.string()),
  draft: o->S.field("draft", S.bool()),
})
