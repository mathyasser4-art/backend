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

// CORS Configuration - Allow requests from frontend domains & mobile WebViews
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
  'http://localhost:3001',
  'http://localhost:3005',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'file://'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman) or null
    if (!origin || origin === 'null') {
      return callback(null, true);
    }

    // Allow exact matches from whitelist
    if (whitelist.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Allow mobile app schemas & localhost on any port
    if (
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('file://') ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    
    // Allow Vercel preview branches or any private local network IPs (e.g. testing from phone)
    if (
      origin.endsWith('.vercel.app') || 
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) || 
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin)
    ) {
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

const { authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter, chatRouter, competitionRouter, competitionEventRouter } = require('./router/allRoutes');
app.use(authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter, chatRouter, competitionRouter, competitionEventRouter);

const request = require('request')
const CronJob = require('cron').CronJob;

// --- LIVE DASHBOARD HEARTBEAT ---
const activeSessions = new Map();
const DailyVisit = require('./DB/models/dailyVisit.model.js');
const userModel = require('./DB/models/user.model.js');
const jwt = require('jsonwebtoken');

app.post('/heartbeat', async (req, res) => {
    try {
        const { sessionId, userId, role, userName, schoolId } = req.body;
        let userSchoolId = schoolId || null;

        if (sessionId) {
            activeSessions.set(sessionId, {
                timestamp: Date.now(),
                userId: userId || null,
                role: role || 'Visitor',
                userName: userName || 'Anonymous',
                schoolId: userSchoolId
            });
        }
        
        // Record historical visit for authenticated users
        if (userId && role && role !== 'Visitor') {
            const dateStr = new Date().toISOString().split('T')[0];
            
            // If schoolId was not sent from client, try to resolve it from user model
            if (!userSchoolId) {
                try {
                    const u = await userModel.findById(userId).select('role createdBy');
                    if (u) {
                        if (u.role === 'School') userSchoolId = u._id;
                        else if (u.createdBy) userSchoolId = u.createdBy;
                    }
                } catch (e) {}
            }

            const updateObj = { role, userName, lastSeen: new Date() };
            if (userSchoolId) updateObj.schoolId = userSchoolId;

            DailyVisit.updateOne(
                { date: dateStr, userId: userId },
                { 
                    $set: updateObj,
                    $setOnInsert: { firstSeen: new Date() }
                },
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

// Helper to extract school context from auth header
const getSchoolContext = async (req) => {
    const { authrization } = req.headers;
    if (authrization && authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
        const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1];
        if (userToken && userToken !== 'null' && userToken !== 'undefined') {
            try {
                const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY);
                const user = await userModel.findById(id);
                if (user && (user.role === 'School' || user.role === 'Teacher' || user.role === 'IT' || user.role === 'Supervisor')) {
                    let schoolId = user._id;
                    if ((user.role === 'Teacher' || user.role === 'Supervisor') && user.createdBy) {
                        schoolId = user.createdBy;
                    }
                    const schoolUsers = await userModel.find({
                        $or: [{ _id: schoolId }, { createdBy: schoolId }]
                    }).select('_id');
                    const schoolUserIds = schoolUsers.map(u => String(u._id));
                    return { isSchoolFiltered: true, schoolId: String(schoolId), schoolUserIds };
                }
            } catch (err) {}
        }
    }
    return { isSchoolFiltered: false };
};

app.get('/live-stats', async (req, res) => {
    try {
        let users = Array.from(activeSessions.values());
        const ctx = await getSchoolContext(req);

        if (ctx.isSchoolFiltered) {
            users = users.filter(u => 
                (u.schoolId && String(u.schoolId) === ctx.schoolId) ||
                (u.userId && ctx.schoolUserIds.includes(String(u.userId)))
            );
        }

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
        const { startDate, endDate, date } = req.query;
        let dateQuery = {};

        if (startDate && endDate) {
            dateQuery = { date: { $gte: startDate, $lte: endDate } };
        } else if (startDate) {
            dateQuery = { date: { $gte: startDate } };
        } else if (endDate) {
            dateQuery = { date: { $lte: endDate } };
        } else {
            const defaultDate = date || new Date().toISOString().split('T')[0];
            dateQuery = { date: defaultDate };
        }

        let query = { ...dateQuery };

        const ctx = await getSchoolContext(req);
        if (ctx.isSchoolFiltered) {
            query.$and = [
                dateQuery,
                {
                    $or: [
                        { schoolId: ctx.schoolId },
                        { userId: { $in: ctx.schoolUserIds } }
                    ]
                }
            ];
        }

        const visits = await DailyVisit.find(query).sort({ date: -1, lastSeen: -1 });
        res.json({
            success: true,
            startDate: startDate || date || new Date().toISOString().split('T')[0],
            endDate: endDate || date || new Date().toISOString().split('T')[0],
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
