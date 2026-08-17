import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function capitalize(name) {
  if (typeof name !== 'string' || name.length === 0) return ''
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatDexNumber(n) {
  return `#${String(n).padStart(3, '0')}`
}

const VOTE_KEY = 'favedex_vote'

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

export default function Dex() {
  const [pokemon, setPokemon] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [vote, setVote] = useState(() => {
    try {
      const raw = localStorage.getItem(VOTE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [confirmSpriteError, setConfirmSpriteError] = useState(false)

  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const tempCanvasRef = useRef(null)
  const snapshotCanvasRef = useRef(null)
  const oldPeakCanvasRef = useRef(null)
  const newPeakCanvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const prevDexNumberRef = useRef(null)

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

  function handleConfirm() {
    if (!selected) return
    const newVote = {
      pokemonId: selected.dexNumber,
      pokemonName: selected.name,
      generation: getGeneration(selected.dexNumber),
      timestamp: Date.now(),
    }
    localStorage.setItem(VOTE_KEY, JSON.stringify(newVote))
    setVote(newVote)
  }

  if (vote) {
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
        <div
          style={{
            width: '400px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <img
            src={spriteUrl(vote.pokemonId, vote.pokemonId > 649 || confirmSpriteError)}
            onError={() => setConfirmSpriteError(true)}
            alt={vote.pokemonName}
            style={{
              width: '300px',
              height: '300px',
              imageRendering: 'pixelated',
            }}
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
  }

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
      <div ref={containerRef} style={{ position: 'relative', width: '280px' }}>
        <button
          onClick={() => setIsOpen((open) => !open)}
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
          <span>{selected ? `#${selected.dexNumber} ${capitalize(selected.name)}` : 'Select a Pokémon'}</span>
          <span style={{ color: '#888' }}>{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              width: '100%',
              background: '#0f0f0f',
              border: '1px solid #333',
              borderRadius: '4px',
              overflow: 'hidden',
              zIndex: 10,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          >
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Pokémon..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                background: '#1a1a1a',
                color: '#f0f0f0',
                border: 'none',
                borderBottom: '1px solid #333',
                outline: 'none',
                fontSize: '14px',
              }}
            />
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {filtered.map((p) => (
                <li
                  key={p.name}
                  onClick={() => handleSelect(p)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#f0f0f0',
                  }}
                >
                  #{p.dexNumber} {capitalize(p.name)}
                </li>
              ))}
              {filtered.length === 0 && (
                <li style={{ padding: '8px 12px', fontSize: '14px', color: '#555' }}>
                  No results
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="preview-fade-in"
          style={{
            marginTop: '24px',
            width: '400px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ position: 'relative', width: '300px', height: '300px' }}>
            <img
              ref={imgRef}
              alt={selected.name}
              onError={() => {
                const fallback = spriteUrl(selected.dexNumber, true)
                if (imgRef.current && imgRef.current.src !== fallback) {
                  imgRef.current.src = fallback
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '300px',
                height: '300px',
                imageRendering: 'pixelated',
              }}
            />
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '300px',
                height: '300px',
                imageRendering: 'pixelated',
              }}
            />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{capitalize(selected.name)}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>{formatDexNumber(selected.dexNumber)}</div>
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
        </div>
      )}
    </div>
  )
}
