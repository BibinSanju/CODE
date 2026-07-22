import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PGlite } from '@electric-sql/pglite'

// Prisma 7 requires explicit connection adapter
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const app = new Hono()

// Allow m1's frontend to talk to your backend
app.use('/*', cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend-project.vercel.app'
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.get('/', (c) => {
  return c.json({ status: 'live', message: 'Backend Engine is running 🚀' })
})

// Phase 2: GET Questions API
app.get('/questions', async (c) => {
  try {
    const questions = await prisma.question.findMany()
    return c.json({ success: true, data: questions })
  } catch (error) {
    console.error(error)
    return c.json({ success: false, error: 'Failed to fetch questions' }, 500)
  }
})

// Phase 3: Piston Code Execution API (Python, Java, etc.)
app.post('/execute/code', async (c) => {
  try {
    const { language, version, code } = await c.req.json()
    const response = await fetch('https://emacs.piston.rs/api/v2/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language,
        version: version, // e.g., "3.10.0" for python
        files: [{ content: code }],
      })
    })
    const result = await response.json()
    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Code execution error:', error)
    return c.json({ success: false, error: 'Code execution failed' }, 500)
  }
})

// Phase 3: SQL Execution Engine (In-Memory Postgres)
app.post('/execute/sql', async (c) => {
  try {
    const { schema, query } = await c.req.json()

    // Spin up a fresh, isolated in-memory Postgres database in milliseconds
    const db = new PGlite()

    // 1. Run the setup schema (e.g., CREATE TABLE and INSERT mock data)
    if (schema) {
      await db.exec(schema)
    }

    // 2. Execute the user's query
    const result = await db.query(query)

    return c.json({ success: true, data: result.rows })
  } catch (error: any) {
    console.error('SQL execution error:', error)
    // Return a 400 with the exact SQL error so m1 can display it beautifully
    return c.json({ success: false, error: error.message }, 400)
  }
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})