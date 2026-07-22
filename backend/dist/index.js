import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// Prisma 7 explicit connection adapter
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = new Hono();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);
// Allow m1's frontend to talk to your backend
app.use('/*', cors({
    origin: [
        'http://localhost:5173',
        'https://your-frontend-project.vercel.app'
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
app.get('/', (c) => {
    return c.json({ status: 'live', message: 'Backend Engine is running 🚀' });
});
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon_super_secret';
// Phase 2: Native Signup API
app.post('/signup', async (c) => {
    try {
        const { email, password, username } = await c.req.json();
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return c.json({ success: false, error: 'Email already in use' }, 400);
        }
        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                username
            }
        });
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '24h' });
        return c.json({ success: true, token, user: { id: newUser.id, username: newUser.username } });
    }
    catch (error) {
        console.error('Signup error:', error);
        return c.json({ success: false, error: 'Signup failed' }, 500);
    }
});
// Phase 2: Native Login API
app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            return c.json({ success: false, error: 'Invalid credentials' }, 401);
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return c.json({ success: false, error: 'Invalid credentials' }, 401);
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
        return c.json({ success: true, token, user: { id: user.id, username: user.username } });
    }
    catch (error) {
        console.error('Login error:', error);
        return c.json({ success: false, error: 'Login failed' }, 500);
    }
});
// Phase 2: Advanced User Profile API (LeetCode Style)
app.get('/users/:id', async (c) => {
    try {
        const userId = c.req.param('id');
        // Fetch user and all their submissions, including the related question data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                submissions: {
                    include: { question: true }
                }
            }
        });
        if (!user) {
            return c.json({ success: false, error: 'User not found' }, 404);
        }
        // Process data for the frontend dashboard
        const passedSubmissions = user.submissions.filter(sub => sub.status === 'Pass');
        // 1. Total Solved Count (Unique questions passed)
        const uniqueSolvedIds = new Set(passedSubmissions.map(sub => sub.questionId));
        const totalSolved = uniqueSolvedIds.size;
        // 2. Category Breakdown (DSA, DB, ML, SysDesign)
        const categoryStats = passedSubmissions.reduce((acc, sub) => {
            const cat = sub.question.category;
            if (!acc[cat])
                acc[cat] = new Set();
            acc[cat].add(sub.questionId);
            return acc;
        }, {});
        // Format category stats for charts (e.g., { DSA: 5, DB: 2 })
        const formattedCategories = Object.keys(categoryStats).reduce((acc, key) => {
            acc[key] = categoryStats[key].size;
            return acc;
        }, {});
        // 3. Calendar Data (Submissions grouped by date for heatmap)
        const calendarData = passedSubmissions.reduce((acc, sub) => {
            const dateString = sub.submittedAt.toISOString().split('T')[0];
            acc[dateString] = (acc[dateString] || 0) + 1;
            return acc;
        }, {});
        return c.json({
            success: true,
            data: {
                username: user.username,
                joinedAt: user.createdAt,
                stats: {
                    totalSolved,
                    categoryBreakdown: formattedCategories,
                    calendarHeatmap: calendarData
                },
                recentSubmissions: user.submissions.slice(-10)
            }
        });
    }
    catch (error) {
        console.error('User fetch error:', error);
        return c.json({ success: false, error: 'Failed to fetch user profile' }, 500);
    }
});
// Phase 3: Record Submission API
app.post('/submissions', async (c) => {
    try {
        const { userId, questionId, status, code, language } = await c.req.json();
        const submission = await prisma.submission.create({
            data: {
                userId,
                questionId,
                status,
                code,
                language
            }
        });
        return c.json({ success: true, data: submission });
    }
    catch (error) {
        console.error('Submission error:', error);
        return c.json({ success: false, error: 'Failed to record submission' }, 500);
    }
});
// Phase 2: GET Questions API
app.get('/questions', async (c) => {
    try {
        const questions = await prisma.question.findMany();
        return c.json({ success: true, data: questions });
    }
    catch (error) {
        console.error(error);
        return c.json({ success: false, error: 'Failed to fetch questions' }, 500);
    }
});
// Phase 3: Piston Code Execution API (Python, Java, etc.)
app.post('/execute/code', async (c) => {
    try {
        const { language, version, code } = await c.req.json();
        const response = await fetch('https://emacs.piston.rs/api/v2/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: language,
                version: version,
                files: [{ content: code }],
            })
        });
        const result = await response.json();
        return c.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Code execution error:', error);
        return c.json({ success: false, error: 'Code execution failed' }, 500);
    }
});
// Phase 3: SQL Execution Engine (In-Memory Postgres)
app.post('/execute/sql', async (c) => {
    try {
        const { schema, query } = await c.req.json();
        const db = new PGlite();
        if (schema) {
            await db.exec(schema);
        }
        const result = await db.query(query);
        return c.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('SQL execution error:', error);
        return c.json({ success: false, error: error.message }, 400);
    }
});
// Phase 4: Push to GitHub API
app.post('/push-to-github', async (c) => {
    try {
        const { token, owner, repo, path, code, commitMessage } = await c.req.json();
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const content = Buffer.from(code).toString('base64');
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'Hono-Backend-Engine'
            },
            body: JSON.stringify({
                message: commitMessage || 'feat: automated commit from hackathon IDE',
                content: content
            })
        });
        const result = await response.json();
        if (!response.ok) {
            return c.json({ success: false, error: result.message }, response.status);
        }
        return c.json({ success: true, url: result.content.html_url });
    }
    catch (error) {
        console.error('GitHub Push Error:', error);
        return c.json({ success: false, error: 'Failed to push to GitHub' }, 500);
    }
});
serve({
    fetch: app.fetch,
    port
});
