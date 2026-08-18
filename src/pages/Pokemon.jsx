import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getGeneration } from './Dex'
import { aggregateVotes, computeRanks, formatRank } from './Results'

function capitalize(name) {
  if (typeof name !== 'string' || name.length === 0) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatDexNumber(n) {
  return `#${String(n).padStart(3, '0')}`
}

function spriteUrl(id, useFallback) {
  return useFallback
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`
}

export default function Pokemon() {
  const { id } = useParams()
  const pokemonId = Number(id)
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [spriteError, setSpriteError] = useState(false)
  const [overallRank, setOverallRank] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('votes')
      .select('id, username, reason, city, country, created_at, pokemon_name')
      .eq('pokemon_id', pokemonId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        setVotes(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pokemonId])

  useEffect(() => {
    let cancelled = false

    supabase
      .from('votes')
      .select('pokemon_id, pokemon_name, generation')
      .then(({ data, error: fetchError }) => {
        if (cancelled || fetchError) return
        const leaderboard = aggregateVotes(data ?? [])
        const ranks = computeRanks(leaderboard)
        const index = leaderboard.findIndex((entry) => entry.pokemonId === pokemonId)
        setOverallRank(index === -1 ? null : ranks[index])
      })

    return () => {
      cancelled = true
    }
  }, [pokemonId])

  if (loading) return <div style={{ color: '#f0f0f0' }}>Loading...</div>
  if (error) return <div style={{ color: '#f0f0f0' }}>Error: {error}</div>

  const pokemonName = votes.find((v) => v.pokemon_name)?.pokemon_name ?? null
  const generation = getGeneration(pokemonId)
  const reasons = votes.filter((v) => v.reason && v.reason.trim().length > 0)

  return (
    <div
      className="dex-page"
      style={{
        color: '#f0f0f0',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <Link
          to="/results"
          style={{
            display: 'inline-block',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#888',
            textDecoration: 'none',
          }}
        >
          ← Back to leaderboard
        </Link>

        <div
          style={{
            background: 'var(--panel-bg)',
            backdropFilter: 'var(--panel-blur)',
            WebkitBackdropFilter: 'var(--panel-blur)',
            border: '1px solid var(--panel-border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <img
            className="sprite-static"
            src={spriteUrl(pokemonId, pokemonId > 649 || spriteError)}
            onError={() => setSpriteError(true)}
            alt={pokemonName ?? `Pokémon ${formatDexNumber(pokemonId)}`}
          />
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {pokemonName ? capitalize(pokemonName) : `Pokémon ${formatDexNumber(pokemonId)}`}
          </div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {formatDexNumber(pokemonId)} · Generation {generation}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {overallRank !== null && (
              <div
                style={{
                  fontSize: overallRank <= 3 ? '28px' : '20px',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  color: overallRank <= 3 ? undefined : '#888',
                }}
              >
                {formatRank(overallRank)}
              </div>
            )}
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
              {votes.length} {votes.length === 1 ? 'vote' : 'votes'}
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Reasons</h2>

        {reasons.length === 0 ? (
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
            No reasons submitted yet.
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
            {reasons.map((vote) => {
              const location = [vote.city, vote.country].filter(Boolean).join(', ')
              return (
                <li
                  key={vote.id}
                  className="leaderboard-item"
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'var(--panel-bg)',
                    backdropFilter: 'var(--panel-blur)',
                    WebkitBackdropFilter: 'var(--panel-blur)',
                    border: '1px solid var(--panel-border-color)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '14px', overflowWrap: 'break-word' }}>{vote.reason}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    — {vote.username ? vote.username : 'Anonymous'}
                    {location ? ` · ${location}` : ''}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
