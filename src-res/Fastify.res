open RescriptStruct

type t

module Reply = {
  type t

  @send external status: (t, int) => t = "status"
}

type headers = {\"x-hub-signature-256": string}
type request<'a> = {body: 'a, headers: headers}

module Response = {
  type t = {ok: bool}

  let responseStruct = S.object(o => {
    ok: o->S.field("ok", S.bool()),
  })
}

type handleRequest<'a> = (request<'a>, Reply.t) => promise<Response.t>

type createOptions = {logger: bool}

@module("fastify") external fastify: createOptions => t = "default"

@send external post: (t, string, handleRequest<'a>) => unit = "post"
