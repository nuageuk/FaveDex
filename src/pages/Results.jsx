import { Link } from 'react-router-dom'
import '../App.css'

const VOTE_KEY = 'favedex_vote'

function capitalize(name) {
  if (typeof name !== 'string' || name.length === 0) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatDexNumber(n) {
  return `#${String(n).padStart(3, '0')}`
}

function staticSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

function loadVotes() {
  try {
    const raw = localStorage.getItem(VOTE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function aggregateVotes(votes) {
  const byPokemon = new Map()
  votes.forEach((vote) => {
    if (!vote || typeof vote.pokemonId !== 'number') return
    const existing = byPokemon.get(vote.pokemonId)
    if (existing) {
      existing.count += 1
    } else {
      byPokemon.set(vote.pokemonId, {
        pokemonId: vote.pokemonId,
        pokemonName: vote.pokemonName,
        generation: vote.generation,
        count: 1,
      })
    }
  })
  return Array.from(byPokemon.values()).sort((a, b) => b.count - a.count)
}

export default function Results() {
  const leaderboard = aggregateVotes(loadVotes())

  return (
    <div
      className="dex-page"
      style={{
        color: '#f0f0f0',
        minHeight: '100vh',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ width: '480px', maxWidth: '100%' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
          Leaderboard
        </h1>

        {leaderboard.length === 0 ? (
          <div
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '24px',
              textAlign: 'center',
              color: '#888',
            }}
          >
            <p style={{ marginBottom: '12px' }}>No votes yet — be the first!</p>
            <Link to="/dex" style={{ color: '#fff' }}>
              Go to the Dex
            </Link>
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {leaderboard.map((entry) => (
              <li
                key={entry.pokemonId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  padding: '10px 12px',
                }}
              >
                <img
                  src={staticSpriteUrl(entry.pokemonId)}
                  alt={entry.pokemonName}
                  style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{capitalize(entry.pokemonName)}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {formatDexNumber(entry.pokemonId)} · Generation {entry.generation}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                  {entry.count} {entry.count === 1 ? 'vote' : 'votes'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
