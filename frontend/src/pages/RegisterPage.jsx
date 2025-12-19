import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function RegisterPage() {

  // Basic form state
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)


    try {
      // send the user info to the backend to create an account
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      })


      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Registration failed')
      } 
      else {
        setSuccess('Registered successfully! You can now log in.')
        setTimeout(() => {
          navigate('/login')
        }, 800)
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
      
        <h2>Create a Tasker account</h2>

        <form onSubmit={handleSubmit} className="auth-form">
        
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

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
            {loading ? 'Registering...' : 'Register'}
          </button>
          
        </form>

        {error && (
          <p
            style={{
              color: '#fca5a5',
              marginTop: '0.75rem',
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            style={{
              color: '#4ade80',
              marginTop: '0.75rem',
            }}
          >
            {success}
          </p>
        )}

        <p className="auth-switch">
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage

