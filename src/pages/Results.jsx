import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import { getGeneration } from './Dex'
import { supabase } from '../lib/supabase'

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

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function formatRank(rank) {
  if (rank <= 3) return RANK_MEDALS[rank - 1]
  const lastTwo = rank % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${rank}th`
  switch (rank % 10) {
    case 1:
      return `${rank}st`
    case 2:
      return `${rank}nd`
    case 3:
      return `${rank}rd`
    default:
      return `${rank}th`
  }
}

function computeRanks(entries) {
  const ranks = []
  entries.forEach((entry, index) => {
    ranks.push(index > 0 && entry.count === entries[index - 1].count ? ranks[index - 1] : index + 1)
  })
  return ranks
}

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GEN_OPTIONS = ['all', ...GENERATIONS]

function genLabel(gen) {
  return gen === 'all' ? 'All' : `Gen ${gen}`
}

function aggregateVotes(votes) {
  const byPokemon = new Map()
  votes.forEach((vote) => {
    if (!vote || typeof vote.pokemon_id !== 'number') return
    const existing = byPokemon.get(vote.pokemon_id)
    if (existing) {
      existing.count += 1
    } else {
      byPokemon.set(vote.pokemon_id, {
        pokemonId: vote.pokemon_id,
        pokemonName: vote.pokemon_name,
        generation: vote.generation,
        count: 1,
      })
    }
  })
  return Array.from(byPokemon.values()).sort((a, b) => b.count - a.count)
}

export default function Results() {
  const [selectedGen, setSelectedGen] = useState('all')
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const genFilterRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('votes')
      .select('pokemon_id, pokemon_name, generation')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        setLeaderboard(aggregateVotes(data ?? []))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (genFilterRef.current && !genFilterRef.current.contains(e.target)) {
        setIsGenOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelectGen(gen) {
    setSelectedGen(gen)
    setIsGenOpen(false)
  }

  const filteredLeaderboard =
    selectedGen === 'all'
      ? leaderboard
      : leaderboard.filter((entry) => getGeneration(entry.pokemonId) === selectedGen)
  const ranks = computeRanks(filteredLeaderboard)

  if (loading) return <div style={{ color: '#f0f0f0' }}>Loading...</div>
  if (error) return <div style={{ color: '#f0f0f0' }}>Error: {error}</div>

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
          <div ref={genFilterRef} style={{ position: 'relative', width: '100%', maxWidth: '220px' }}>
            <button
              onClick={() => setIsGenOpen((open) => !open)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#f0f0f0',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <span>{genLabel(selectedGen)}</span>
              <span style={{ color: '#888' }}>{isGenOpen ? '▲' : '▼'}</span>
            </button>

            {isGenOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '100%',
                  background: 'var(--panel-bg)',
                  backdropFilter: 'var(--panel-blur)',
                  WebkitBackdropFilter: 'var(--panel-blur)',
                  border: '1px solid var(--panel-border-color)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}
              >
                <ul
                  className="gen-filter-list"
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}
                >
                  {GEN_OPTIONS.map((gen) => (
                    <li
                      key={gen}
                      onClick={() => handleSelectGen(gen)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#f0f0f0',
                      }}
                    >
                      {genLabel(gen)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
            {filteredLeaderboard.map((entry, index) => {
              const rank = ranks[index]
              return (
                <li key={entry.pokemonId} style={{ listStyle: 'none' }}>
                  <Link
                    to={`/pokemon/${entry.pokemonId}`}
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
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        flexShrink: 0,
                        textAlign: 'center',
                        fontSize: rank <= 3 ? '18px' : '13px',
                        fontWeight: 'bold',
                        color: rank <= 3 ? undefined : '#888',
                      }}
                    >
                      {formatRank(rank)}
                    </div>
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
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
