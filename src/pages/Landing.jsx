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
          FaveDex is a live, vote-based popularity tracker for all 1025 National Dex Pokémon, including regional
          variants, alternate forms, Mega Evolutions, and more! Every vote is
          tagged with your location to build a real-time picture of the world&apos;s favourite Pokémon, along
          with usernames and their reasons why. It&apos;s part of Nuage&apos;s PC, alongside other projects
          such as GlitchMon and Shiny Hunt Simulator.
        </p>
        <button className="enter-btn landing-fade-in" onClick={() => navigate('/dex')}>
          Cast your vote →
        </button>
      </div>
    </div>
  )
}