import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:5000'

function DashboardPage() {
  const [email, setEmail] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCourse, setNewCourse] = useState('')
  const [newDueDate, setNewDueDate] = useState('')

  const navigate = useNavigate()

  // get the user and tasks on load
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
          description: newDescription,
          course: newCourse,
          dueDate: newDueDate,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to create task')
      } else {
        setTasks((prev) => [data.task, ...prev])
        setNewTitle('')
        setNewDescription('')
        setNewCourse('')
        setNewDueDate('')
      }
    } catch (err) {
      console.error(err)
      setError('Network error while creating task')
    }
  }

  async function handleDeleteTask(id) {
    if (!window.confirm('Delete this task?')) return

    setError('')

    try {
      const res = await fetch(
        `${API_BASE}/api/tasks/${id}?email=${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
        }
      )

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to delete task')
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== id))
      }
    } catch (err) {
      console.error(err)
      setError('Network error while deleting task')
    }
  }

  // mark a task as done
  async function handleMarkDone(id) {
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          status: 'done',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to update task')
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'done' } : t
          )
        )
      }
    } catch (err) {
      console.error(err)
      setError('Network error while updating task')
    }
  }

  // move a finished task back to active
  async function handleMoveBack(id) {
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          status: 'pending',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to update task')
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'pending' } : t
          )
        )
      }
    } catch (err) {
      console.error(err)
      setError('Network error while updating task')
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

  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const finishedTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div className="dashboard">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2>Tasker Dashboard</h2>

        <div>
          <span
            style={{
              fontSize: '0.85rem',
              marginRight: '0.75rem',
            }}
          >
            Logged in as: {email}
          </span>

          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <form
        onSubmit={handleAddTask}
        style={{
          marginTop: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <input
            type="text"
            placeholder="Task title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={3}
          />

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
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
        </div>
      </form>

      {loading && <p>Loading tasks...</p>}

      {error && !loading && (
        <p
          style={{
            color: '#fca5a5',
          }}
        >
          {error}
        </p>
      )}

      {!loading && tasks.length === 0 && !error && (
        <p>You have no tasks yet. Add one above!</p>
      )}

      {!loading && tasks.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '1.5rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
          }}
        >
          {/* Active tasks column */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h3>Active Tasks</h3>

            {activeTasks.length === 0 && (
              <p style={{ fontSize: '0.9rem' }}>No active tasks.</p>
            )}

            {activeTasks.length > 0 && (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  marginTop: '0.5rem',
                }}
              >
                {activeTasks.map((task) => (
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
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>

                      {task.description && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          {task.description}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#9ca3af',
                          marginTop: '0.25rem',
                        }}
                      >
                        {task.course ? `Course: ${task.course} · ` : ''}
                        {task.due_date ? `Due: ${task.due_date}` : 'No due date'}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.25rem',
                      }}
                    >
                      <button
                        onClick={() => handleMarkDone(task.id)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Done
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Finished tasks column */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h3>Finished Tasks</h3>

            {finishedTasks.length === 0 && (
              <p style={{ fontSize: '0.9rem' }}>No finished tasks yet.</p>
            )}

            {finishedTasks.length > 0 && (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  marginTop: '0.5rem',
                }}
              >
                {finishedTasks.map((task) => (
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
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.title}</div>

                      {task.description && (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          {task.description}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#9ca3af',
                          marginTop: '0.25rem',
                        }}
                      >
                        {task.course ? `Course: ${task.course} · ` : ''}
                        {task.due_date ? `Due: ${task.due_date}` : 'No due date'}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '0.25rem',
                      }}
                    >
                      <button
                        onClick={() => handleMoveBack(task.id)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Move back
                      </button>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage

