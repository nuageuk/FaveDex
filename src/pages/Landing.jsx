import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <div className="landing-card">
        <div className="logo landing-fade-in">FaveDex</div>
        <div className="badge landing-fade-in">Beta</div>
        <h1 className="landing-fade-in">Vote for your favourite Pokémon. See what the world picks.</h1>
        <p className="landing-fade-in" style={{ maxWidth: '440px', lineHeight: 1.5 }}>
          FaveDex is a live, vote-based popularity map — every vote gets plotted by location to build a
          real-time picture of the world's favourite Pokémon. It's part of Nuage&apos;s PC, alongside
          GlitchMon and the Shiny Hunt Simulator.
        </p>
        <button className="enter-btn landing-fade-in" onClick={() => navigate('/dex')}>
          Cast your vote →
        </button>
      </div>
    </div>
  )
}