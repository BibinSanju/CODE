import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

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

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})