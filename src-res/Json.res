type parseError = ParseError(Js.Exn.t)

let parse = (content): result<'a, parseError> =>
  switch Js.Json.parseExn(content) {
  | json => Ok(json)
  | exception Js.Exn.Error(exn) => Error(ParseError(exn))
  }
