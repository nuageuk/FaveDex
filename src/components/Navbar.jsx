import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAVBAR_WIDTH = 200

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dex', label: 'FaveDex' },
  { to: '/results', label: 'Leaderboard' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="navbar-mobile-header">
        <button
          className="navbar-hamburger"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="navbar-mobile-title">Nuage&apos;s PC</div>
      </div>

      {isOpen && <div className="navbar-backdrop" onClick={() => setIsOpen(false)} />}

      <nav
        className={`navbar${isOpen ? ' navbar-open' : ''}`}
        style={{
          width: `${NAVBAR_WIDTH}px`,
          background: '#0a0a0a',
          borderRight: '1px solid #222',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          className="navbar-title"
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.5px',
            marginBottom: '32px',
          }}
        >
          Nuage&apos;s PC
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setIsOpen(false)}
              style={({ isActive }) => ({
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
                textDecoration: 'none',
                color: isActive ? '#0f0f0f' : '#aaa',
                background: isActive ? '#fff' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
