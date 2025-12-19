import { Routes, Route, Link } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Tasker</h1>
        <nav>
          <Link to="/login">Login</Link>
          <span> | </span>
          <Link to="/register">Register</Link>
          <span> | </span>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

