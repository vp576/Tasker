import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Handle login form submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Send email and password to the backend
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      // if backend says it failed, show the error
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login failed')
      } else if (data.mfaRequired) {
        // If password was correct, we need MFA
        localStorage.setItem('pendingMfaEmail', email)
        navigate('/mfa')
      } else {

        localStorage.setItem('taskerEmail', email)
        navigate('/dashboard')
      }
      
    } catch (err) {
      console.error(err)
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
      
        <h2>Login to Tasker</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
        </form>

        {error && (
          <p style={{ color: '#fca5a5', marginTop: '0.75rem' }}>
            {error}
          </p>
        )}

        <p className="auth-switch">
          Don&apos;t have an account? <a href="/register">Register</a> </p>
      </div>
    </div>
  )
}

export default LoginPage

