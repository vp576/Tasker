const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
require('dotenv').config()
const fs = require('fs')
const path = require('path')


const app = express()

const logFilePath = path.join(__dirname, 'logs', 'app.log')
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })

// simple request logger
app.use((req, res, next) => {
  const start = new Date()

  res.on('finish', () => {
    const line = `[${start.toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode}\n`
    logStream.write(line)
    console.log(line.trim())
  })

  next()
})


const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tasker_user',
  password: process.env.DB_PASSWORD || 'TaskerPass123!',
  database: process.env.DB_NAME || 'tasker_db',
})

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tasker API is running' })
})

app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result')
    res.json({ ok: true, db: rows[0].result })
  } catch (error) {
    console.error('DB test error:', error)
    res.status(500).json({ ok: false, error: 'Database connection failed' })
  }
})

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' })
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    )

    res.status(201).json({ ok: true, message: 'User registered successfully' })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' })
    }

    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }

    const user = rows[0]

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 5 * 60 * 1000)

    await pool.query(
      'UPDATE users SET mfa_code = ?, mfa_expires_at = ? WHERE id = ?',
      [code, expires, user.id]
    )

    console.log(`MFA code for ${email}: ${code}`)

    res.json({
      ok: true,
      message: 'Password correct, MFA code generated',
      mfaRequired: true,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

app.post('/api/verify-mfa', async (req, res) => {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({ ok: false, error: 'Email and code are required' })
    }

    const [rows] = await pool.query(
      'SELECT id, mfa_code, mfa_expires_at FROM users WHERE email = ?',
      [email]
    )

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const user = rows[0]

    if (!user.mfa_code || !user.mfa_expires_at) {
      return res.status(400).json({ ok: false, error: 'No active MFA code for this user' })
    }

    const now = new Date()
    const expiresAt = new Date(user.mfa_expires_at)

    if (now > expiresAt) {
      return res.status(401).json({ ok: false, error: 'MFA code has expired' })
    }

    if (user.mfa_code !== code) {
      return res.status(401).json({ ok: false, error: 'Invalid MFA code' })
    }

    await pool.query(
      'UPDATE users SET mfa_code = NULL, mfa_expires_at = NULL WHERE id = ?',
      [user.id]
    )

    res.json({ ok: true, message: 'MFA verified successfully' })
  } catch (error) {
    console.error('MFA verify error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

// helper: get user id by email
async function getUserIdByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  )

  if (rows.length === 0) {
    return null
  }

  return rows[0].id
}

// get tasks for a user
app.get('/api/tasks', async (req, res) => {
  try {
    const email = req.query.email

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' })
    }

    const userId = await getUserIdByEmail(email)
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const [rows] = await pool.query(
      'SELECT id, title, description, course, due_date, status, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )

    res.json({ ok: true, tasks: rows })
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

// add a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { email, title, description, course, dueDate } = req.body

    if (!email || !title) {
      return res.status(400).json({ ok: false, error: 'Email and title are required' })
    }

    const userId = await getUserIdByEmail(email)
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, description, course, due_date) VALUES (?, ?, ?, ?, ?)',
      [userId, title, description || null, course || null, dueDate || null]
    )

    res.status(201).json({
      ok: true,
      task: {
        id: result.insertId,
        user_id: userId,
        title,
        description: description || null,
        course: course || null,
        due_date: dueDate || null,
        status: 'pending',
      },
    })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

// delete a task (only if it belongs to the user)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id
    const email = req.query.email

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' })
    }

    const userId = await getUserIdByEmail(email)
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Task not found' })
    }

    res.json({ ok: true, message: 'Task deleted' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})


// update task status (for example, mark as done)
app.patch('/api/tasks/:id/status', async (req, res) => {
  try {
    const taskId = req.params.id
    const { status, email } = req.body

    if (!email || !status) {
      return res.status(400).json({ ok: false, error: 'Email and status are required' })
    }

    const userId = await getUserIdByEmail(email)
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const [result] = await pool.query(
      'UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?',
      [status, taskId, userId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Task not found' })
    }

    res.json({ ok: true, message: 'Task status updated' })
  } catch (error) {
    console.error('Update task status error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})


const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Tasker backend listening on port ${PORT}`)
})

