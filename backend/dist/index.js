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
        // 2. Difficulty Breakdown (Easy, Medium, Hard)
        const difficultyStats = passedSubmissions.reduce((acc, sub) => {
            const diff = sub.question.difficulty || 'Medium';
            if (!acc[diff])
                acc[diff] = new Set();
            acc[diff].add(sub.questionId);
            return acc;
        }, {});
        const formattedDifficulty = {
            Easy: difficultyStats['Easy']?.size || 0,
            Medium: difficultyStats['Medium']?.size || 0,
            Hard: difficultyStats['Hard']?.size || 0,
        };
        // 3. Calendar Data (Submissions grouped by date for heatmap)
        const calendarData = user.submissions.reduce((acc, sub) => {
            const dateString = sub.submittedAt.toISOString().split('T')[0];
            acc[dateString] = (acc[dateString] || 0) + 1;
            return acc;
        }, {});
        // Calculate Max Streak and Total Active Days
        const activeDays = Object.keys(calendarData).sort();
        const totalActiveDays = activeDays.length;
        let maxStreak = 0;
        let currentStreak = 0;
        let previousDate = null;
        for (const dateStr of activeDays) {
            const date = new Date(dateStr);
            if (!previousDate) {
                currentStreak = 1;
            }
            else {
                const diffTime = Math.abs(date.getTime() - previousDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                }
                else {
                    currentStreak = 1;
                }
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            previousDate = date;
        }
        // Query for total questions
        const totalQuestions = await prisma.question.count();
        const totalEasy = await prisma.question.count({ where: { difficulty: 'Easy' } });
        const totalMedium = await prisma.question.count({ where: { difficulty: 'Medium' } });
        const totalHard = await prisma.question.count({ where: { difficulty: 'Hard' } });
        // Pass all the user fields from the schema as well
        return c.json({
            success: true,
            data: {
                username: user.username,
                joinedAt: user.createdAt,
                rank: user.rank,
                reputation: user.reputation,
                views: user.views,
                discuss: user.discuss,
                solution: user.solution,
                contestRating: user.contestRating,
                globalRanking: user.globalRanking,
                attendedContests: user.attendedContests,
                stats: {
                    totalSolved,
                    difficultyBreakdown: formattedDifficulty,
                    calendarHeatmap: calendarData,
                    totalActiveDays,
                    maxStreak
                },
                totalAvailable: {
                    Total: totalQuestions,
                    Easy: totalEasy,
                    Medium: totalMedium,
                    Hard: totalHard
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
// Phase 3: Piston Code Execution API (Raw Execution)
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
// Phase 3: Piston Code Submit API (Runs against test cases)
app.post('/execute/submit', async (c) => {
    try {
        const { questionId, language, version, code, userId, isRun } = await c.req.json();
        const question = await prisma.question.findUnique({ where: { id: questionId } });
        if (!question || !question.testCases) {
            return c.json({ success: false, error: 'Question or test cases not found' }, 404);
        }
        let testCases = question.testCases;
        if (isRun) {
            testCases = testCases.slice(0, 2);
        }
        const results = [];
        let allPassed = true;
        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            let wrapperCode = code;
            // Inject wrapper based on language to call solution function and print output
            if (language === 'javascript') {
                wrapperCode = `
${code}
const input = ${JSON.stringify(tc.input)};
const result = solution(input.nums, input.target);
console.log(JSON.stringify(result));
`;
            }
            else if (language === 'python') {
                wrapperCode = `
import json
${code}
input_data = json.loads('${JSON.stringify(tc.input)}')
try:
    if 'nums' in input_data and 'target' in input_data:
        result = solution(input_data['nums'], input_data['target'])
    else:
        result = solution(**input_data)
    print(json.dumps(result))
except Exception as e:
    import traceback
    print("Error:", str(e))
    traceback.print_exc()
`;
            }
            else {
                return c.json({ success: false, error: 'Test execution is currently only supported for JavaScript and Python.' });
            }
            const response = await fetch('https://emacs.piston.rs/api/v2/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: language,
                    version: version,
                    files: [{ content: wrapperCode }],
                })
            });
            const result = await response.json();
            const outputStr = result.run?.stdout?.trim();
            let actualOutput = outputStr;
            try {
                if (outputStr)
                    actualOutput = JSON.parse(outputStr);
            }
            catch (e) { }
            // Compare arrays/objects safely
            const passed = JSON.stringify(actualOutput) === JSON.stringify(tc.expectedOutput);
            if (!passed)
                allPassed = false;
            results.push({
                testCase: i + 1,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput,
                passed,
                error: result.run?.stderr
            });
        }
        if (userId && !isRun) {
            await prisma.submission.create({
                data: {
                    userId,
                    questionId,
                    status: allPassed ? 'Pass' : 'Fail',
                    code,
                    language
                }
            });
        }
        return c.json({ success: true, data: { results, allPassed } });
    }
    catch (error) {
        console.error('Submit error:', error);
        return c.json({ success: false, error: 'Submit execution failed' }, 500);
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
