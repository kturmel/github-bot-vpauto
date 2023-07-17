type users

let fetchUser = async id => {
  await Discord.discordClient->Client.users->UserManager.fetch(id)
}

let get = async () => {
  let users: array<User.t> = []

  switch await fetchUser("139136227256434688") {
  | Ok(kevin) => {
      let _ = users->(Js.Array.push(kevin, _))
    }
  | Error(_) =>
    let _ = ()
  }

  switch await fetchUser("902105924423020584") {
  | Ok(pierreHenry) => {
      let _ = users->(Js.Array.push(pierreHenry, _))
    }
  | Error(_) =>
    let _ = ()
  }

  switch await fetchUser("920903211240550441") {
  | Ok(abdel) => {
      let _ = users->(Js.Array.push(abdel, _))
    }
  | Error(_) =>
    let _ = ()
  }

  switch await fetchUser("786512517618597891") {
  | Ok(rachid) => {
      let _ = users->(Js.Array.push(rachid, _))
    }
  | Error(_) =>
    let _ = ()
  }

  users
}
