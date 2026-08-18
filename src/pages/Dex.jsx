import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter } from 'bad-words'
import { reverseGeocode } from '../utils/geo'
import { hasVotedToday, setVotedCookie } from '../utils/voteLimit'

const profanityFilter = new Filter()

function stripHtmlTags(value) {
  return value.replace(/<[^>]*>/g, '')
}

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

const CANVAS_SIZE = 300
const MIN_BLOCK_SIZE = 4
const PIXELATE_PHASE_MS = 150
const CROSSFADE_MS = 80

function drawPixelated(ctx, tempCanvas, img, blockSize) {
  const size = Math.max(1, Math.round(blockSize))
  tempCanvas.width = size
  tempCanvas.height = size
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.imageSmoothingEnabled = false
  tempCtx.clearRect(0, 0, size, size)
  tempCtx.drawImage(img, 0, 0, size, size)

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.drawImage(tempCanvas, 0, 0, size, size, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
}

export const GENERATION_RANGES = [
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

export function getGeneration(id) {
  const index = GENERATION_RANGES.findIndex(([start, end]) => id >= start && id <= end)
  return index === -1 ? null : index + 1
}

function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diffMs = midnight - now
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export default function Dex() {
  const [pokemon, setPokemon] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [vote, setVote] = useState(null)
  const [confirmSpriteError, setConfirmSpriteError] = useState(false)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [votedToday, setVotedToday] = useState(() => hasVotedToday())
  const [username, setUsername] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState(null)

  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const tempCanvasRef = useRef(null)
  const snapshotCanvasRef = useRef(null)
  const oldPeakCanvasRef = useRef(null)
  const newPeakCanvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const prevDexNumberRef = useRef(null)
  const spriteLoadTimeoutRef = useRef(null)
  const confirmSpriteTimeoutRef = useRef(null)

  useEffect(() => {
    fetch('https://pokeapi.co/api/v2/pokemon?limit=1025')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setPokemon(data.results)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!selected) return

    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    const ctx = canvas.getContext('2d')

    if (!tempCanvasRef.current) {
      tempCanvasRef.current = document.createElement('canvas')
    }
    const tempCanvas = tempCanvasRef.current

    if (!snapshotCanvasRef.current) {
      const snapshot = document.createElement('canvas')
      snapshot.width = CANVAS_SIZE
      snapshot.height = CANVAS_SIZE
      snapshotCanvasRef.current = snapshot
    }
    const snapshotCanvas = snapshotCanvasRef.current

    if (!oldPeakCanvasRef.current) {
      const c = document.createElement('canvas')
      c.width = CANVAS_SIZE
      c.height = CANVAS_SIZE
      oldPeakCanvasRef.current = c
    }
    const oldPeakCanvas = oldPeakCanvasRef.current

    if (!newPeakCanvasRef.current) {
      const c = document.createElement('canvas')
      c.width = CANVAS_SIZE
      c.height = CANVAS_SIZE
      newPeakCanvasRef.current = c
    }
    const newPeakCanvas = newPeakCanvasRef.current

    if (prevDexNumberRef.current === selected.dexNumber) return
    const isFirstSelection = prevDexNumberRef.current === null
    prevDexNumberRef.current = selected.dexNumber

    const nextUrl = spriteUrl(selected.dexNumber, selected.dexNumber > 649)

    if (isFirstSelection) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      img.src = nextUrl
      return
    }

    let cancelled = false

    function waitForLoad() {
      return new Promise((resolve) => {
        function handleLoad() {
          img.removeEventListener('load', handleLoad)
          resolve()
        }
        img.addEventListener('load', handleLoad, { once: true })
      })
    }

    function runPhase(source, from, to) {
      return new Promise((resolve) => {
        const start = performance.now()
        function step(now) {
          if (cancelled) {
            resolve()
            return
          }
          const t = Math.min(1, (now - start) / PIXELATE_PHASE_MS)
          const size = from + (to - from) * t
          drawPixelated(ctx, tempCanvas, source, size)
          if (t < 1) {
            animationFrameRef.current = requestAnimationFrame(step)
          } else {
            resolve()
          }
        }
        animationFrameRef.current = requestAnimationFrame(step)
      })
    }

    function crossfade(fromCanvas, toCanvas, duration) {
      return new Promise((resolve) => {
        const start = performance.now()
        function step(now) {
          if (cancelled) {
            resolve()
            return
          }
          const t = Math.min(1, (now - start) / duration)
          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
          ctx.globalAlpha = 1 - t
          ctx.drawImage(fromCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
          ctx.globalAlpha = t
          ctx.drawImage(toCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
          ctx.globalAlpha = 1
          if (t < 1) {
            animationFrameRef.current = requestAnimationFrame(step)
          } else {
            resolve()
          }
        }
        animationFrameRef.current = requestAnimationFrame(step)
      })
    }

    // Freeze the outgoing sprite's current frame so the pixelate-out phase
    // isn't disrupted by the GIF continuing to animate underneath.
    const snapshotCtx = snapshotCanvas.getContext('2d')
    snapshotCtx.imageSmoothingEnabled = false
    snapshotCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    snapshotCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

    img.style.opacity = '0'

    runPhase(snapshotCanvas, CANVAS_SIZE, MIN_BLOCK_SIZE)
      .then(() => {
        if (cancelled) return undefined
        // Capture the peak-pixelation frame of the outgoing sprite so it can
        // be crossfaded against, since the visible canvas gets overwritten next.
        const oldPeakCtx = oldPeakCanvas.getContext('2d')
        oldPeakCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        oldPeakCtx.drawImage(canvas, 0, 0)

        const loadPromise = waitForLoad()
        img.src = nextUrl
        return loadPromise
      })
      .then(() => {
        if (cancelled) return undefined
        const newPeakCtx = newPeakCanvas.getContext('2d')
        drawPixelated(newPeakCtx, tempCanvas, img, MIN_BLOCK_SIZE)
        return crossfade(oldPeakCanvas, newPeakCanvas, CROSSFADE_MS)
      })
      .then(() => {
        if (cancelled) return undefined
        return runPhase(img, MIN_BLOCK_SIZE, CANVAS_SIZE)
      })
      .then(() => {
        if (cancelled) return
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
        img.style.opacity = '1'
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [selected])

  useEffect(() => {
    if (!selected || selected.dexNumber > 649) return
    const img = imgRef.current
    if (!img) return

    function handleLoad() {
      if (spriteLoadTimeoutRef.current) {
        clearTimeout(spriteLoadTimeoutRef.current)
        spriteLoadTimeoutRef.current = null
      }
    }

    spriteLoadTimeoutRef.current = setTimeout(() => {
      const fallback = spriteUrl(selected.dexNumber, true)
      if (img.src !== fallback) {
        img.src = fallback
      }
    }, 1500)

    img.addEventListener('load', handleLoad)

    return () => {
      if (spriteLoadTimeoutRef.current) {
        clearTimeout(spriteLoadTimeoutRef.current)
        spriteLoadTimeoutRef.current = null
      }
      img.removeEventListener('load', handleLoad)
    }
  }, [selected])

  useEffect(() => {
    if (!vote || vote.pokemonId > 649 || confirmSpriteError) return

    confirmSpriteTimeoutRef.current = setTimeout(() => {
      setConfirmSpriteError(true)
    }, 1500)

    return () => {
      if (confirmSpriteTimeoutRef.current) {
        clearTimeout(confirmSpriteTimeoutRef.current)
        confirmSpriteTimeoutRef.current = null
      }
    }
  }, [vote, confirmSpriteError])

  async function finalizeVote(location) {
    if (!selected) return
    const cleanUsername = stripHtmlTags(username.trim())
    const cleanReason = stripHtmlTags(reason.trim())
    const pokemonId = selected.dexNumber
    const pokemonName = selected.name
    const generation = getGeneration(pokemonId)

    let response
    try {
      response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pokemon_id: pokemonId,
          pokemon_name: pokemonName,
          generation,
          city: location?.city ?? null,
          country: location?.country ?? null,
          username: cleanUsername.length > 0 ? cleanUsername : null,
          reason: cleanReason.length > 0 ? cleanReason : null,
        }),
      })
    } catch {
      setShowLocationPrompt(false)
      setFormError('Something went wrong submitting your vote. Please try again.')
      return
    }

    if (!response.ok) {
      setShowLocationPrompt(false)
      setFormError(
        response.status === 429
          ? 'You have already voted today.'
          : 'Something went wrong submitting your vote. Please try again.'
      )
      return
    }

    setVotedCookie()
    setVotedToday(true)
    setVote({ pokemonId, pokemonName, generation })
    setShowLocationPrompt(false)
  }

  function handleConfirm() {
    if (!selected) return
    const trimmedUsername = username.trim()
    const trimmedReason = reason.trim()
    if (
      (trimmedUsername.length > 0 && profanityFilter.isProfane(trimmedUsername)) ||
      (trimmedReason.length > 0 && profanityFilter.isProfane(trimmedReason))
    ) {
      setFormError('Please remove inappropriate language before submitting.')
      return
    }
    setFormError(null)
    setShowLocationPrompt(true)
  }

  function handleAllowLocation() {
    if (!navigator.geolocation) {
      finalizeVote(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        let city = null
        let country = null
        try {
          const geocoded = await reverseGeocode(lat, lng)
          city = geocoded.city
          country = geocoded.country
        } catch {
          // ignore geocoding failures, still record raw coords
        }
        finalizeVote({ city, country })
      },
      () => {
        finalizeVote(null)
      }
    )
  }

  function handleSkipLocation() {
    finalizeVote(null)
  }

  if (vote) {
    return (
      <div
        className="dex-page"
        style={{
          color: '#f0f0f0',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
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
          }}
        >
          <img
            className="sprite-static"
            src={spriteUrl(vote.pokemonId, vote.pokemonId > 649 || confirmSpriteError)}
            onError={() => setConfirmSpriteError(true)}
            onLoad={() => {
              if (confirmSpriteTimeoutRef.current) {
                clearTimeout(confirmSpriteTimeoutRef.current)
                confirmSpriteTimeoutRef.current = null
              }
            }}
            alt={vote.pokemonName}
          />
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{capitalize(vote.pokemonName)}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>Generation {vote.generation}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>Thanks for voting!</div>
          <Link to="/results" style={{ marginTop: '8px', fontSize: '13px', color: '#fff' }}>
            View results
          </Link>
        </div>
      </div>
    )
  }

  if (votedToday) {
    return (
      <div
        className="dex-page"
        style={{
          color: '#f0f0f0',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
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
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>You&apos;ve already voted today</div>
          <div style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>
            Come back in {getTimeUntilMidnight()} to vote again
          </div>
          <Link to="/results" style={{ marginTop: '8px', fontSize: '13px', color: '#fff' }}>
            View results
          </Link>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ color: '#f0f0f0' }}>Loading...</div>
  if (error) return <div style={{ color: '#f0f0f0' }}>Error: {error}</div>

  const numbered = pokemon.map((p, i) => ({ ...p, dexNumber: i + 1 }))
  const filtered =
    query.length > 0
      ? numbered.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      : numbered

  function handleSelect(p) {
    setSelected(p)
    setQuery('')
    setIsOpen(false)
    setUsername('')
    setReason('')
    setFormError(null)
  }

  return (
    <div
      className="dex-page"
      style={{
        color: '#f0f0f0',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value
            setQuery(value)
            setIsOpen(value.length > 0)
          }}
          onFocus={() => {
            if (query.length > 0) setIsOpen(true)
          }}
          placeholder="Search Pokémon..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            background: '#1a1a1a',
            color: '#f0f0f0',
            border: '1px solid #333',
            borderRadius: '4px',
            outline: 'none',
            fontSize: '16px',
          }}
        />

        {isOpen && query.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              width: '100%',
              listStyle: 'none',
              margin: 0,
              padding: 0,
              background: 'var(--panel-bg)',
              backdropFilter: 'var(--panel-blur)',
              WebkitBackdropFilter: 'var(--panel-blur)',
              border: '1px solid var(--panel-border-color)',
              borderRadius: '12px',
              overflowY: 'auto',
              maxHeight: '264px',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <li
                  key={p.name}
                  onClick={() => handleSelect(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#f0f0f0',
                  }}
                >
                  <img
                    src={`/icons/${p.dexNumber}.png`}
                    alt=""
                    onError={(e) => {
                      const fallback = spriteUrl(p.dexNumber, true)
                      if (e.target.src !== fallback) {
                        e.target.src = fallback
                      }
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    #{p.dexNumber} {capitalize(p.name)}
                  </span>
                </li>
              ))
            ) : (
              <li style={{ padding: '8px 12px', fontSize: '14px', color: '#555' }}>No results</li>
            )}
          </ul>
        )}
      </div>

      {selected && (
        <div
          className="preview-fade-in"
          style={{
            marginTop: '24px',
            width: '100%',
            maxWidth: '400px',
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
          }}
        >
          <div className="sprite-preview-wrapper">
            <img
              ref={imgRef}
              className="sprite-preview-layer"
              alt={selected.name}
              onError={() => {
                const fallback = spriteUrl(selected.dexNumber, true)
                if (imgRef.current && imgRef.current.src !== fallback) {
                  imgRef.current.src = fallback
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="sprite-preview-layer"
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
            />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{capitalize(selected.name)}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>{formatDexNumber(selected.dexNumber)}</div>

          {!showLocationPrompt && (
            <>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>
                  Username <span style={{ color: '#555' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
                    setUsername(cleaned)
                  }}
                  maxLength={20}
                  placeholder="e.g. ash_ketchum"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    background: '#0f0f0f',
                    color: '#f0f0f0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: '#888' }}>
                  Reason <span style={{ color: '#555' }}>(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 280))}
                  maxLength={280}
                  rows={3}
                  placeholder="Why is this your favourite?"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    background: '#0f0f0f',
                    color: '#f0f0f0',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ fontSize: '11px', color: '#555', textAlign: 'right' }}>{reason.length}/280</div>
              </div>

              {formError && (
                <div style={{ fontSize: '12px', color: '#ff6b6b', textAlign: 'center' }}>{formError}</div>
              )}
            </>
          )}

          {showLocationPrompt ? (
            <div
              style={{
                marginTop: '8px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>
                We&apos;d like to know your location to plot your vote on the map
              </div>
              <button
                onClick={handleAllowLocation}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#fff',
                  color: '#0f0f0f',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Allow location
              </button>
              <button
                onClick={handleSkipLocation}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#1a1a1a',
                  color: '#f0f0f0',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          ) : (
            <button
              onClick={handleConfirm}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '10px 12px',
                background: '#fff',
                color: '#0f0f0f',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Confirm my pick
            </button>
          )}
        </div>
      )}
    </div>
  )
}
