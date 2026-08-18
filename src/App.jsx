import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dex from './pages/Dex.jsx'
import Results from './pages/Results.jsx'
import Navbar from './components/Navbar.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dex" element={<Dex />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
    </>
  )
}