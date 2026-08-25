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

// Mirrors GENERATION_RANGES in src/pages/Dex.jsx.
const GENERATION_RANGES = [
  [1, 151],
  [152, 251],
  [252, 386],
  [387, 493],
  [494, 649],
  [650, 721],
  [722, 809],
  [810, 905],
  [906, 1025],
]

function getGeneration(id) {
  const index = GENERATION_RANGES.findIndex(([start, end]) => id >= start && id <= end)
  return index === -1 ? null : index + 1
}

// Mirrors FORM_GENERATION_MAP in src/pages/Dex.jsx. The client only sends the
// formatted display name (e.g. "Charizard (Mega X)"), not the raw slug, so
// matching is done via substring against the lowercased name rather than an
// exact slug-segment match.
const FORM_GENERATION_MAP = {
  alola: 7,
  galar: 8,
  hisui: 8,
  paldea: 9,
  mega: 6,
  gmax: 8,
  gigantamax: 8,
  primal: 6,
  origin: 4,
  therian: 5,
}

function getFormGeneration(pokemonName) {
  const lower = pokemonName.toLowerCase()
  const match = Object.keys(FORM_GENERATION_MAP).find((key) => lower.includes(key))
  return match ? FORM_GENERATION_MAP[match] : null
}

function deriveGeneration(pokemonId, pokemonName) {
  return pokemonId > 1025 ? getFormGeneration(pokemonName) : getGeneration(pokemonId)
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

  const { pokemon_id: pokemonId, pokemon_name: pokemonName, username, reason, city, country } = payload

  if (!Number.isInteger(pokemonId) || pokemonId < 1) {
    return jsonResponse(400, { error: 'Invalid pokemon_id' })
  }
  if (typeof pokemonName !== 'string' || pokemonName.trim().length === 0) {
    return jsonResponse(400, { error: 'Invalid pokemon_name' })
  }

  const generation = deriveGeneration(pokemonId, pokemonName)
  if (!Number.isInteger(generation) || generation < 1 || generation > 9) {
    return jsonResponse(400, { error: 'Unable to determine generation' })
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
      pokemon_name: pokemonName.trim().slice(0, MAX_NAME_LENGTH),
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
