type t

type fetchResult = UserNotFound

@send external fetch: (t, string) => promise<User.t> = "fetch"

let fetch = async (t, id) => {
  switch await fetch(t, id) {
  | user => Ok(user)
  | exception Js.Exn.Error(_) => Error(UserNotFound)
  }
}
