import { useEffect, useRef, useState } from 'react'

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function Dex() {
  const [pokemon, setPokemon] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const containerRef = useRef(null)

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
      style={{
        background: '#0f0f0f',
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
    </div>
  )
}
