import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
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

function formatRelativeTime(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 60) return 'just now'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

function spriteUrl(id, useFallback) {
  return useFallback
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`
}

function extractIdFromUrl(url) {
  const segments = url.split('/').filter(Boolean)
  return Number(segments[segments.length - 1])
}

export default function Pokemon() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const backHref = location.state?.from ?? '/results'
  const pokemonId = Number(id)
  const isValidId = Number.isInteger(pokemonId) && pokemonId >= 1
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [spriteError, setSpriteError] = useState(false)
  const [overallRank, setOverallRank] = useState(null)
  const [apiName, setApiName] = useState(null)
  const [apiNameLoading, setApiNameLoading] = useState(true)
  const [baseDexNumber, setBaseDexNumber] = useState(null)
  const spriteTimeoutRef = useRef(null)

  useEffect(() => {
    if (!isValidId) {
      navigate('/404', { replace: true })
    }
  }, [isValidId, navigate])

  useEffect(() => {
    if (!isValidId) return

    let cancelled = false
    setLoading(true)

    supabase
      .from('votes')
      .select('id, username, reason, city, country, created_at, pokemon_name, generation')
      .eq('pokemon_id', pokemonId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          navigate('/404', { replace: true })
          return
        }
        setVotes(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pokemonId, isValidId, navigate])

  useEffect(() => {
    if (!isValidId) return

    let cancelled = false

    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          navigate('/404', { replace: true })
          return
        }
        return res.json().then((data) => {
          if (cancelled) return
          setApiName(data.name)
          setApiNameLoading(false)
          if (pokemonId > 1025) {
            setBaseDexNumber(extractIdFromUrl(data.species.url))
          }
        })
      })
      .catch(() => {
        if (cancelled) return
        setApiNameLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [pokemonId, isValidId, navigate])

  useEffect(() => {
    if (!isValidId) return

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
  }, [pokemonId, isValidId])

  useEffect(() => {
    if (!isValidId || pokemonId > 649 || spriteError) return

    spriteTimeoutRef.current = setTimeout(() => {
      setSpriteError(true)
    }, 1500)

    return () => {
      if (spriteTimeoutRef.current) {
        clearTimeout(spriteTimeoutRef.current)
        spriteTimeoutRef.current = null
      }
    }
  }, [isValidId, pokemonId, spriteError])

  if (!isValidId) return null
  if (loading) return <div style={{ color: '#f0f0f0' }}>Loading...</div>

  const votedName = votes.find((v) => v.pokemon_name)?.pokemon_name ?? null
  if (!votedName && apiNameLoading) return <div style={{ color: '#f0f0f0' }}>Loading...</div>

  const pokemonName = votedName ?? apiName
  const votedGeneration = votes.find((v) => typeof v.generation === 'number')?.generation ?? null
  const generation = votedGeneration ?? getGeneration(pokemonId)
  const displayDexNumber = pokemonId > 1025 && baseDexNumber !== null ? baseDexNumber : pokemonId
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
      <Link to={backHref} className="back-link">
        ← Back to leaderboard
      </Link>

      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            width: '320px',
            height: 'auto',
            boxSizing: 'border-box',
            alignSelf: 'center',
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
            onLoad={() => {
              if (spriteTimeoutRef.current) {
                clearTimeout(spriteTimeoutRef.current)
                spriteTimeoutRef.current = null
              }
            }}
            alt={pokemonName ?? `Pokémon ${formatDexNumber(displayDexNumber)}`}
            style={{ width: '180px', height: '180px', objectFit: 'contain' }}
          />
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {pokemonName ? capitalize(pokemonName) : `Pokémon ${formatDexNumber(displayDexNumber)}`}
          </div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {formatDexNumber(displayDexNumber)} · Generation {generation}
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
                    minHeight: '72px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'var(--panel-bg)',
                    backdropFilter: 'var(--panel-blur)',
                    WebkitBackdropFilter: 'var(--panel-blur)',
                    border: '1px solid var(--panel-border-color)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '14px', overflowWrap: 'break-word' }}>{vote.reason}</div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#888', overflowWrap: 'break-word' }}>
                      — {vote.username ? vote.username : 'Anonymous'}
                      {location ? ` · ${location}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatRelativeTime(vote.created_at)}
                    </div>
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
