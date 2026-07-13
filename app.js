const express = require('express')
const app = express()
require('dotenv').config()

// Validate SALTROUNDS environment variable
const saltRounds = parseInt(process.env.SALTROUNDS);
if (isNaN(saltRounds) || saltRounds < 1) {
    console.warn('Invalid or missing SALTROUNDS environment variable, using default value of 10');
    process.env.SALTROUNDS = 10;
}

const cors = require('cors')

// CORS Configuration - Allow requests from frontend domains
const whitelist = [
  'https://abacusheroes.com',
  'https://www.abacusheroes.com',
  'https://practice-papers.com',
  'https://practicepapers.online',
  'https://frontend-pearl-ten-60.vercel.app',
  'https://abacus-2ntk.onrender.com',
  'https://backend-production-6752.up.railway.app',
  'https://abacus-dashboard-one.vercel.app',
  'https://dashboard-alpha-woad-54.vercel.app',
  'https://dashboard-33v3lnkua-abacusheroes-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow exact matches from whitelist
    if (!origin || whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow any Vercel preview branch or local network IPs (e.g. testing from phone)
    if (origin.endsWith('.vercel.app') || /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) || /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin)) {
      return callback(null, true);
    }

    console.log('Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token', 'authrization']
};

app.use(cors(corsOptions));
const port = process.env.PORT || 3000

app.use(express.json())
const connectionDB = require('./DB/connection')
connectionDB();

// Rate limiting - Set to 1000 to support up to 100 concurrent students competing behind the same classroom NAT IP router
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later',
});
app.use(limiter);

const { authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter, chatRouter, competitionRouter } = require('./router/allRoutes');
app.use(authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter, chatRouter, competitionRouter);

const request = require('request')
const CronJob = require('cron').CronJob;

// --- LIVE DASHBOARD HEARTBEAT ---
const activeSessions = new Map();
const DailyVisit = require('./DB/models/dailyVisit.model.js');

app.post('/heartbeat', (req, res) => {
    try {
        const { sessionId, userId, role, userName } = req.body;
        if (sessionId) {
            activeSessions.set(sessionId, {
                timestamp: Date.now(),
                userId: userId || null,
                role: role || 'Visitor',
                userName: userName || 'Anonymous'
            });
        }
        
        // Record historical visit for authenticated users
        if (userId && role && role !== 'Visitor') {
            const dateStr = new Date().toISOString().split('T')[0];
            DailyVisit.updateOne(
                { date: dateStr, userId: userId },
                { $set: { role, userName, lastSeen: new Date() } },
                { upsert: true }
            ).catch(err => console.error("Error logging daily visit:", err));
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cleanup inactive sessions every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (let [id, data] of activeSessions.entries()) {
        if (now - data.timestamp > 60000) { // 60 seconds timeout
            activeSessions.delete(id);
        }
    }
}, 30000);

app.get('/live-stats', (req, res) => {
    try {
        const users = Array.from(activeSessions.values());
        res.json({
            success: true,
            totalVisitors: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/historical-stats', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const visits = await DailyVisit.find({ date }).sort({ lastSeen: -1 });
        res.json({
            success: true,
            date: date,
            users: visits
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// -------------------------------

// Health check endpoint
app.get('/health', async (req, res) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };

    if (dbState === 1) {
        res.status(200).json({
            status: 'healthy',
            database: states[dbState],
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({
            status: 'unhealthy',
            database: states[dbState],
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});
