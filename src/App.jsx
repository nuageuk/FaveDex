import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dex from './pages/Dex.jsx'
import Results from './pages/Results.jsx'
import Navbar from './components/Navbar.jsx'

const NAVBAR_WIDTH = 200

export default function App() {
  return (
    <>
      <Navbar />
      <div style={{ marginLeft: `${NAVBAR_WIDTH}px` }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dex" element={<Dex />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </>
  )
}