export const config = { runtime: 'edge' }

const MAX_NAME_LENGTH = 50
const MAX_USERNAME_LENGTH = 20
const MAX_REASON_LENGTH = 280
const MAX_LOCATION_LENGTH = 100

// Best-effort, single-instance rate limiting. Edge functions can run as
// multiple isolated instances and this map is reset on cold start, so this
// is a soft limit, not a guarantee — real enforcement should also live in
// Supabase RLS.
const voteLog = new Map()

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function stripHtmlTags(value) {
  return value.replace(/<[^>]*>/g, '')
}

// Matches the SQL side's initcap(): capitalizes the first letter of each
// letter run and lowercases the rest, leaving separators (spaces, hyphens,
// parens, apostrophes) untouched. Keeping insert-time casing consistent
// prevents new rows from re-fragmenting get_leaderboard()'s grouping.
function toTitleCase(value) {
  return value.replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function sanitizeString(value, maxLength) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return undefined
  const cleaned = stripHtmlTags(value).trim().slice(0, maxLength)
  return cleaned.length > 0 ? cleaned : null
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  if (!payload || typeof payload !== 'object') {
    return jsonResponse(400, { error: 'Invalid request body' })
  }

  const { pokemon_id: pokemonId, pokemon_name: pokemonName, generation, username, reason, city, country } = payload

  if (!Number.isInteger(pokemonId) || pokemonId < 1) {
    return jsonResponse(400, { error: 'Invalid pokemon_id' })
  }
  if (typeof pokemonName !== 'string' || pokemonName.trim().length === 0) {
    return jsonResponse(400, { error: 'Invalid pokemon_name' })
  }
  if (!Number.isInteger(generation) || generation < 1 || generation > 9) {
    return jsonResponse(400, { error: 'Invalid generation' })
  }

  const cleanCity = sanitizeString(city, MAX_LOCATION_LENGTH)
  const cleanCountry = sanitizeString(country, MAX_LOCATION_LENGTH)
  const cleanUsername = sanitizeString(username, MAX_USERNAME_LENGTH)
  const cleanReason = sanitizeString(reason, MAX_REASON_LENGTH)

  if (cleanCity === undefined || cleanCountry === undefined || cleanUsername === undefined || cleanReason === undefined) {
    return jsonResponse(400, { error: 'Invalid field type' })
  }

  const ip = getClientIp(request)
  const rateLimitKey = `${ip}:${getDateKey()}`

  if (voteLog.has(rateLimitKey)) {
    return jsonResponse(429, { error: 'You have already voted today' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: 'Server misconfigured' })
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      pokemon_id: pokemonId,
      pokemon_name: toTitleCase(pokemonName.trim().slice(0, MAX_NAME_LENGTH)),
      generation,
      city: cleanCity,
      country: cleanCountry,
      username: cleanUsername,
      reason: cleanReason,
    }),
  })

  if (!insertResponse.ok) {
    return jsonResponse(500, { error: 'Failed to record vote' })
  }

  voteLog.set(rateLimitKey, Date.now())

  return jsonResponse(200, { success: true })
}
