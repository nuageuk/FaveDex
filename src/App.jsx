import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dex from './pages/Dex.jsx'
import Results from './pages/Results.jsx'
import Navbar from './components/Navbar.jsx'
import { getStoredTheme, setStoredTheme } from './utils/theme'

export default function App() {
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => {
    setStoredTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'video' ? 'dark' : 'video'))
  }

  return (
    <div className={`theme-${theme}`}>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dex" element={<Dex />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </div>
  )
}
