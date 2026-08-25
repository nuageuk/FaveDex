export function capitalize(name) {
  if (typeof name !== 'string' || name.length === 0) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function extractIdFromUrl(url) {
  const segments = url.split('/').filter(Boolean)
  return Number(segments[segments.length - 1])
}

export function formatDexNumber(n) {
  return `#${String(n).padStart(3, '0')}`
}

export function mapLeaderboardRow(row) {
  return {
    pokemonId: row.pokemon_id,
    pokemonName: row.pokemon_name,
    generation: row.generation,
    count: Number(row.count),
  }
}
