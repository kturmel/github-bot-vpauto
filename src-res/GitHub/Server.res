open Fastify

let server = fastify({
  logger: true,
})

let badResponse: Response.t = {ok: false}
let goodResponse: Response.t = {ok: true}

type body = PullRequest(PullRequestEvent.t) | Zen(Zen.t)

type jsonError = NotObject | UnexpectedType

let getZen = body => {
  switch Js.Json.decodeObject(body) {
  | Some(body) =>
    switch Js.Dict.get(body, "zen") {
    | Some(zen) =>
      switch Js.Json.decodeString(zen) {
      | Some(zen) => {
          let zen: Zen.t = {zen: zen}
          Ok(Some(Zen(zen)))
        }
      | None => Error(UnexpectedType)
      }
    | None => Ok(None)
    }
  | None => Error(NotObject)
  }
}

let getEvent = (body): result<option<body>, Js.Exn.t> => {
  switch Js.Json.decodeObject(body) {
  | Some(body) =>
    switch Js.Dict.get(body, "pull_request") {
    | Some(pullRequest) =>
      let pullRequest = RescriptStruct.S.parseWith(pullRequest, PullRequestEvent.tStruct)

      Ok(Some(PullRequest(pullRequest)))
    | None => Ok(None)
    }
  | None => Error(NotObject)
  }
}

server->post("/github", async (req, reply) => {
  let body = getZen(req.body)

  switch body {
  | Ok(Some(_)) => goodResponse
  | Error(UnexpectedType) => {
      let _ = reply->Reply.status(400)

      badResponse
    }
  | Ok(None) => {
      let isSignatureValid =
        req.headers.\"x-hub-signature-256"->VerifySignature.verifySignature(
          Variables.githubSecret(),
          Js.Json.serializeExn(req.body),
        )

      if !isSignatureValid {
        let _ = reply->Reply.status(403)

        badResponse
      } else {
        let body = getEvent(req.body)

        switch body {
        | Ok(None) => {
            let _ = reply->Reply.status(400)

            badResponse
          }
        | Ok(Some(pullRequest)) => {
            Js.log(pullRequest)

            goodResponse
          }
        | Error(_) => {
            let _ = reply->Reply.status(400)
            Js.log("Unknown error")

            badResponse
          }
        }
      }
    }
  | Error(_) => badResponse
  }
})
