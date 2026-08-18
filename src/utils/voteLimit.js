const VOTE_COOKIE_NAME = 'favedex_voted'

export function hasVotedToday() {
  return document.cookie
    .split('; ')
    .some((entry) => entry.startsWith(`${VOTE_COOKIE_NAME}=`))
}

export function setVotedCookie() {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${VOTE_COOKIE_NAME}=1; expires=${expires}; path=/`
}
