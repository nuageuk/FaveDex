import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Dex from './pages/Dex.jsx'
import Results from './pages/Results.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dex" element={<Dex />} />
      <Route path="/results" element={<Results />} />
    </Routes>
  )
}