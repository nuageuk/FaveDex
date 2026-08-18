import { Link } from 'react-router-dom'

const PSYDUCK_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/54.png'

export default function NotFound() {
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
        className="preview-fade-in"
        style={{
          width: '100%',
          maxWidth: '360px',
          boxSizing: 'border-box',
          background: 'var(--panel-bg)',
          backdropFilter: 'var(--panel-blur)',
          WebkitBackdropFilter: 'var(--panel-blur)',
          border: '1px solid var(--panel-border-color)',
          borderRadius: '12px',
          padding: '32px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px' }}>❔</div>
        <img
          className="sprite-static"
          src={PSYDUCK_SPRITE_URL}
          alt="Confused Psyduck"
          style={{ width: '180px', height: '180px', objectFit: 'contain' }}
        />
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff' }}>404</div>
        <div style={{ fontSize: '14px', color: '#888' }}>
          Psyduck is just as confused as you are.
        </div>
        <Link to="/" className="enter-btn" style={{ textDecoration: 'none' }}>
          Go home
        </Link>
      </div>
    </div>
  )
}
