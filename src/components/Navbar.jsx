import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAVBAR_WIDTH = 200

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/dex', label: 'FaveDex' },
  { to: '/results', label: 'Leaderboard' },
]

export default function Navbar({ theme, onToggleTheme }) {
  const [isOpen, setIsOpen] = useState(false)

  const themeToggleButton = (
    <button
      onClick={onToggleTheme}
      aria-label={theme === 'video' ? 'Switch to dark theme' : 'Switch to video theme'}
      title={theme === 'video' ? 'Switch to dark theme' : 'Switch to video theme'}
      style={{
        background: 'transparent',
        border: '1px solid #333',
        borderRadius: '4px',
        width: '28px',
        height: '28px',
        fontSize: '14px',
        lineHeight: 1,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {theme === 'video' ? '🎥' : '🌙'}
    </button>
  )

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
        <div style={{ marginLeft: 'auto' }}>{themeToggleButton}</div>
      </div>

      {isOpen && <div className="navbar-backdrop" onClick={() => setIsOpen(false)} />}

      <nav
        className={`navbar${isOpen ? ' navbar-open' : ''}`}
        style={{
          width: `${NAVBAR_WIDTH}px`,
          background: 'var(--panel-bg)',
          backdropFilter: 'var(--panel-blur)',
          WebkitBackdropFilter: 'var(--panel-blur)',
          borderRight: '1px solid var(--panel-border-color)',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.5px',
            }}
          >
            Nuage&apos;s PC
          </span>
          {themeToggleButton}
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
