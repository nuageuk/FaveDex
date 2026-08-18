import { useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dex from './pages/Dex.jsx'
import Results from './pages/Results.jsx'
import Pokemon from './pages/Pokemon.jsx'
import NotFound from './pages/NotFound.jsx'
import Navbar from './components/Navbar.jsx'
import { getStoredTheme, setStoredTheme } from './utils/theme'

function BackgroundVideo() {
  const videoRef = useRef(null)

  useEffect(() => {
    function playOnTouch() {
      videoRef.current?.play()
      document.removeEventListener('touchstart', playOnTouch)
    }

    document.addEventListener('touchstart', playOnTouch, { once: true })

    return () => {
      document.removeEventListener('touchstart', playOnTouch)
    }
  }, [])

  return (
    <>
      <video
        ref={videoRef}
        className="bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        src="/output.webm"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: -1,
        }}
      />
      <div
        className="bg-video-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: -1,
        }}
      />
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState(getStoredTheme)
  const location = useLocation()

  useEffect(() => {
    setStoredTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'video' ? 'dark' : 'video'))
  }

  return (
    <div className={`theme-${theme}`}>
      <BackgroundVideo />
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <div className="app-content" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dex" element={<Dex />} />
          <Route path="/results" element={<Results />} />
          <Route path="/pokemon/:id" element={<Pokemon />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  )
}
