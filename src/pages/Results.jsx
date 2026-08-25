import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import '../App.css'
import { supabase } from '../lib/supabase'
import { capitalize, extractIdFromUrl, formatDexNumber, mapLeaderboardRow } from '../utils/helpers'

function staticSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

const LEADERBOARD_CACHE_TTL_MS = 60000
let leaderboardCache = null

export function getFreshLeaderboardCache() {
  if (!leaderboardCache) return null
  if (Date.now() - leaderboardCache.timestamp >= LEADERBOARD_CACHE_TTL_MS) return null
  return leaderboardCache.data
}

export function setLeaderboardCache(data) {
  leaderboardCache = { data, timestamp: Date.now() }
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export function formatRank(rank) {
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

export function computeRanks(entries) {
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

function LeaderboardRow({ entry, rank, currentUrl, baseId, onNeedBaseId }) {
  const rowRef = useRef(null)

  useEffect(() => {
    if (entry.pokemonId <= 1025 || baseId !== undefined) return
    const el = rowRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onNeedBaseId(entry.pokemonId)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [entry.pokemonId, baseId, onNeedBaseId])

  const displayDexNumber = entry.pokemonId > 1025 ? (baseId ?? entry.pokemonId) : entry.pokemonId

  return (
    <li ref={rowRef} style={{ listStyle: 'none' }}>
      <Link
        to={`/pokemon/${entry.pokemonId}`}
        state={{ from: currentUrl }}
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
          className="leaderboard-rank"
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
            {formatDexNumber(displayDexNumber)} · Generation {entry.generation}
          </div>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {entry.count} {entry.count === 1 ? 'vote' : 'votes'}
        </div>
      </Link>
    </li>
  )
}

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams()
  const genParam = searchParams.get('gen')
  const parsedGen = genParam !== null ? Number(genParam) : null
  const selectedGen = parsedGen !== null && GENERATIONS.includes(parsedGen) ? parsedGen : 'all'
  const searchQuery = searchParams.get('q') ?? ''
  const [leaderboard, setLeaderboard] = useState(() => getFreshLeaderboardCache() ?? [])
  const [loading, setLoading] = useState(() => getFreshLeaderboardCache() === null)
  const [error, setError] = useState(null)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const [baseIdMap, setBaseIdMap] = useState({})
  const genFilterRef = useRef(null)
  const baseIdFetchingRef = useRef(new Set())

  function resolveBaseId(pokemonId) {
    if (baseIdFetchingRef.current.has(pokemonId)) return
    baseIdFetchingRef.current.add(pokemonId)

    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const baseId = extractIdFromUrl(data.species.url)
        setBaseIdMap((prev) => ({ ...prev, [pokemonId]: baseId }))
      })
      .catch(() => {
        baseIdFetchingRef.current.delete(pokemonId)
      })
  }

  useEffect(() => {
    const cached = getFreshLeaderboardCache()
    if (cached) {
      setLeaderboard(cached)
      setLoading(false)
      return
    }

    let cancelled = false

    supabase
      .rpc('get_leaderboard')
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        const mapped = (data ?? []).map(mapLeaderboardRow)
        setLeaderboardCache(mapped)
        setLeaderboard(mapped)
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
    setIsGenOpen(false)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (gen === 'all') {
          next.delete('gen')
        } else {
          next.set('gen', String(gen))
        }
        return next
      },
      { replace: true }
    )
  }

  function handleSearchChange(value) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value.length === 0) {
          next.delete('q')
        } else {
          next.set('q', value)
        }
        return next
      },
      { replace: true }
    )
  }

  const genFilteredLeaderboard =
    selectedGen === 'all' ? leaderboard : leaderboard.filter((entry) => entry.generation === selectedGen)
  const trimmedSearch = searchQuery.trim().toLowerCase()
  const searchWords = trimmedSearch.split(/\s+/).filter(Boolean)
  const filteredLeaderboard =
    searchWords.length > 0
      ? genFilteredLeaderboard.filter((entry) => {
          const name = entry.pokemonName.toLowerCase()
          return searchWords.every((word) => name.includes(word))
        })
      : genFilteredLeaderboard
  const ranks = computeRanks(filteredLeaderboard)
  const paramsString = searchParams.toString()
  const currentUrl = `/results${paramsString ? `?${paramsString}` : ''}`

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

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Pokémon..."
            style={{
              flex: 1,
              minWidth: 0,
              maxWidth: '220px',
              boxSizing: 'border-box',
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#f0f0f0',
              border: '1px solid #333',
              borderRadius: '4px',
              fontSize: '16px',
              outline: 'none',
            }}
          />

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
              {leaderboard.length === 0
                ? 'No votes yet — be the first!'
                : trimmedSearch.length > 0
                  ? 'No Pokémon match your search.'
                  : 'No votes for this generation yet.'}
            </p>
            <Link to="/dex" style={{ color: '#fff' }}>
              Go to the Dex
            </Link>
          </div>
        ) : (
          <ul
            key={`${selectedGen}-${trimmedSearch}`}
            className="leaderboard-list"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {filteredLeaderboard.map((entry, index) => (
              <LeaderboardRow
                key={`${entry.pokemonId}-${entry.pokemonName}`}
                entry={entry}
                rank={ranks[index]}
                currentUrl={currentUrl}
                baseId={baseIdMap[entry.pokemonId]}
                onNeedBaseId={resolveBaseId}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
