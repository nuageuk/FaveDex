import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <div className="logo">FaveDex</div>
      <div className="badge">Beta</div>
      <h1>Vote for your favourite Pokémon. See what the world picks.</h1>
      <p style={{ maxWidth: '440px', lineHeight: 1.5 }}>
        FaveDex is a live, vote-based popularity map — every vote gets plotted by location to build a
        real-time picture of the world's favourite Pokémon. It's part of Nuage&apos;s PC, alongside
        GlitchMon and the Shiny Hunt Simulator.
      </p>
      <button className="enter-btn" onClick={() => navigate('/dex')}>
        Cast your vote →
      </button>
    </div>
  )
}