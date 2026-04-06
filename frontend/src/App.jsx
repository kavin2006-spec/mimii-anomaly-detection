import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Upload    from './pages/Upload'
import Machines  from './pages/Machines'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <span className="nav-brand">⬡ MIMII · Anomaly Detection System</span>
        <div className="nav-status">
          <div className="status-dot" />
          SYSTEM ONLINE
        </div>
        <div className="nav-links">
          <NavLink to="/"          end>Dashboard</NavLink>
          <NavLink to="/analytics"    >Analytics</NavLink>
          <NavLink to="/upload"       >Live Demo</NavLink>
          <NavLink to="/machines"     >Machines</NavLink>
        </div>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/upload"    element={<Upload />}    />
          <Route path="/machines"  element={<Machines />}  />
        </Routes>
      </main>
    </div>
  )
}