import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="container">
      <div className="logo">FaveDex</div>
      <h1>Coming soon.</h1>
      <p>The world's favourite Pokémon, mapped.</p>
      <button className="enter-btn" onClick={() => navigate('/dex')}>
        Enter the Dex
      </button>
      <div className="badge">Under construction</div>
    </div>
  )
}