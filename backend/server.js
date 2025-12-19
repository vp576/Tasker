const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
require('dotenv').config()

const app = express()

//MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'tasker_user',
  password: process.env.DB_PASSWORD || 'TaskerPass123!',
  database: process.env.DB_NAME || 'tasker_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})


// Middleware
app.use(cors())
app.use(express.json())

// Simple test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tasker API is running' })
})

// Test route to check DB connection
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result')
    res.json({ ok: true, db: rows[0].result })
  } catch (error) {
    console.error('DB test error:', error)
    res.status(500).json({ ok: false, error: 'Database connection failed' })
  }
})


// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' })
    }

    // Check if email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: 'Email already in use' })
    }

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Insert new user
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


// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' })
    }

    // Find user by email
    const [rows] = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    )

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }

    const user = rows[0]

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }

    // For now, just return basic user info (no JWT yet)
    res.json({
      ok: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})


// Helper: get user id by email
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

// Get tasks for a user (by email)
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
      'SELECT id, title, course, due_date, status, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )

    res.json({ ok: true, tasks: rows })
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ ok: false, error: 'Server error' })
  }
})

// Add a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { email, title, course, dueDate } = req.body

    if (!email || !title) {
      return res.status(400).json({ ok: false, error: 'Email and title are required' })
    }

    const userId = await getUserIdByEmail(email)
    if (!userId) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    const [result] = await pool.query(
      'INSERT INTO tasks (user_id, title, course, due_date) VALUES (?, ?, ?, ?)',
      [userId, title, course || null, dueDate || null]
    )

    res.status(201).json({
      ok: true,
      task: {
        id: result.insertId,
        user_id: userId,
        title,
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


const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Tasker backend listening on port ${PORT}`)
})

