import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function DashboardPage() {
  const [email, setEmail] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCourse, setNewCourse] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const storedEmail = localStorage.getItem('taskerEmail') || ''
    if (!storedEmail) {
      setError('Please log in to see your tasks.')
      setLoading(false)
      return
    }
    setEmail(storedEmail)
    fetchTasks(storedEmail)
  }, [])

  async function fetchTasks(userEmail) {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(
        `${API_BASE}/api/tasks?email=${encodeURIComponent(userEmail)}`
      )
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to load tasks')
        setTasks([])
      } else {
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error(err)
      setError('Network error while loading tasks')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTask(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          title: newTitle,
          course: newCourse,
          dueDate: newDueDate,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to create task')
      } else {
        // Add new task to the top of the list
        setTasks((prev) => [data.task, ...prev])
        setNewTitle('')
        setNewCourse('')
        setNewDueDate('')
      }
    } catch (err) {
      console.error(err)
      setError('Network error while creating task')
    }
  }

  function handleLogout() {
    localStorage.removeItem('taskerEmail')
    navigate('/login')
  }

  if (!email && error) {
    return (
      <div className="dashboard">
        <h2>Tasker Dashboard</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tasker Dashboard</h2>
        <div>
          <span style={{ fontSize: '0.85rem', marginRight: '0.75rem' }}>
            Logged in as: {email}
          </span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <form onSubmit={handleAddTask} style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Course (optional)"
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
          />
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
          <button type="submit">Add Task</button>
        </div>
      </form>

      {loading && <p>Loading tasks...</p>}
      {error && !loading && <p style={{ color: '#fca5a5' }}>{error}</p>}

      {!loading && tasks.length === 0 && !error && (
        <p>You have no tasks yet. Add one above!</p>
      )}

      {!loading && tasks.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {tasks.map((task) => (
            <li
              key={task.id}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  {task.course ? `Course: ${task.course} · ` : ''}
                  {task.due_date ? `Due: ${task.due_date}` : 'No due date'}
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                {task.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DashboardPage

