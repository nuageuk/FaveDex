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
              className="navbar-link"
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

        <a
          href="https://github.com/nuageuk"
          target="_blank"
          rel="noreferrer"
          className="navbar-credit"
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            textDecoration: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          Made by nuage
        </a>
      </nav>
    </>
  )
}
