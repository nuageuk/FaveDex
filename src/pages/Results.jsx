import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import { getGeneration } from './Dex'

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

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

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
  const [selectedGen, setSelectedGen] = useState('all')
  const leaderboard = aggregateVotes(loadVotes())
  const filteredLeaderboard =
    selectedGen === 'all'
      ? leaderboard
      : leaderboard.filter((entry) => getGeneration(entry.pokemonId) === selectedGen)

  return (
    <div
      className="dex-page"
      style={{
        color: '#f0f0f0',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div className="leaderboard-container">
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
          Leaderboard
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <select
            className="gen-filter-select"
            value={selectedGen}
            onChange={(e) => setSelectedGen(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All</option>
            {GENERATIONS.map((gen) => (
              <option key={gen} value={gen}>
                {`Gen ${gen}`}
              </option>
            ))}
          </select>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div
            className="leaderboard-empty"
            style={{
              background: 'var(--panel-bg)',
              backdropFilter: 'var(--panel-blur)',
              WebkitBackdropFilter: 'var(--panel-blur)',
              border: '1px solid var(--panel-border-color)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#888',
            }}
          >
            <p style={{ marginBottom: '12px' }}>
              {leaderboard.length === 0 ? 'No votes yet — be the first!' : 'No votes for this generation yet.'}
            </p>
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
            {filteredLeaderboard.map((entry) => (
              <li
                key={entry.pokemonId}
                className="leaderboard-item"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--panel-bg)',
                  backdropFilter: 'var(--panel-blur)',
                  WebkitBackdropFilter: 'var(--panel-blur)',
                  border: '1px solid var(--panel-border-color)',
                  borderRadius: '12px',
                }}
              >
                <img
                  className="leaderboard-thumb"
                  src={staticSpriteUrl(entry.pokemonId)}
                  alt={entry.pokemonName}
                  style={{ width: '48px', height: '48px', flexShrink: 0, imageRendering: 'pixelated' }}
                />
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {capitalize(entry.pokemonName)}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#888',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {formatDexNumber(entry.pokemonId)} · Generation {entry.generation}
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', flexShrink: 0, whiteSpace: 'nowrap' }}>
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
