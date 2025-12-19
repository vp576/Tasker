import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function MFAPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  // get the saved email
  useEffect(() => {
    const pendingEmail = localStorage.getItem('pendingMfaEmail') || ''
    if (!pendingEmail) {
      setError('No MFA login session found. Please log in again.')
    }
    setEmail(pendingEmail)
  }, [])

  // Sending the MFA code to the backend to verify it
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/verify-mfa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'MFA verification failed')
      } else {
        setSuccess('MFA verified! Logging you in...')
        // user is now fully logged in
        localStorage.setItem('taskerEmail', email)
        localStorage.removeItem('pendingMfaEmail')
        setTimeout(() => {
          navigate('/dashboard')
        }, 800)
      }
    } catch (err) {
      console.error(err)
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // if no email founnd, send user back to login
  if (!email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>MFA Verification</h2>
          <p>{error || 'No login session found.'}</p>
          <button onClick={() => navigate('/login')}>Back to Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Enter MFA Code</h2>
        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
          A 6-digit code was generated for <strong>{email}</strong>. Check Logs.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            MFA Code
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {error && (
          <p style={{ color: '#fca5a5', marginTop: '0.75rem' }}>
            {error}
          </p>
        )}

        {success && (
          <p style={{ color: '#4ade80', marginTop: '0.75rem' }}>
            {success}
          </p>
        )}

        <p className="auth-switch">
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              marginTop: '0.75rem',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.85rem',
            }}
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  )
}

export default MFAPage

