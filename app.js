const express = require('express')
const app = express()
require('dotenv').config()

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:3',message:'Server startup initiated',data:{nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

// Validate SALTROUNDS environment variable
const saltRounds = parseInt(process.env.SALTROUNDS);
if (isNaN(saltRounds) || saltRounds < 1) {
    console.warn('Invalid or missing SALTROUNDS environment variable, using default value of 10');
    process.env.SALTROUNDS = 10;
}

// #region agent log
const envVars = {
    hasPort: !!process.env.PORT,
    hasOnlineConnectionDb: !!process.env.ONLINE_CONNECTION_DB,
    hasAuthSecretKey: !!process.env.AUTH_SECRET_KEY,
    hasTokenSecretKey: !!process.env.TOKEN_SECRET_KEY,
    port: process.env.PORT || 'NOT_SET',
    onlineConnectionDbLength: process.env.ONLINE_CONNECTION_DB ? process.env.ONLINE_CONNECTION_DB.length : 0
};
fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:12',message:'Environment variables check',data:envVars,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

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
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token', 'authrization']
};

app.use(cors(corsOptions));
const port = process.env.PORT || 3000

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:42',message:'Port configuration',data:{port:port,portType:typeof port},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

app.use(express.json())
const connectionDB = require('./DB/connection')

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:48',message:'Database connection attempt starting',data:{hasConnectionFn:typeof connectionDB === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const dbConnectionResult = connectionDB();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:52',message:'Database connection call completed',data:{isPromise:dbConnectionResult instanceof Promise,hasThen:dbConnectionResult && typeof dbConnectionResult.then === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

if (dbConnectionResult && typeof dbConnectionResult.catch === 'function') {
    dbConnectionResult.catch((error) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:58',message:'Database connection error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
    });
}

// Rate limiting sitting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});
app.use(limiter);

// #region agent log
let routesLoaded = false;
let routeError = null;
try {
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:70',message:'Loading routes - before require',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    const { authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter } = require('./router/allRoutes');
    routesLoaded = true;
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:72',message:'Routes loaded successfully',data:{hasAuthRouter:!!authRouter,hasUserRouter:!!userRouter,hasAssignmentRouter:!!assignmentRouter,routerCount:18},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    app.use(authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter);
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:74',message:'Routes registered successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
} catch (error) {
    routeError = error;
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:76',message:'Route loading/registration error',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    throw error;
}
// #endregion
const request = require('request')
const CronJob = require('cron').CronJob;

// new CronJob('*/10 * * * *', function () {
//     request('https://practice-papers.onrender.com/', function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//             console.log('Wake up the server')
//         }
//     })
// }, null, true, 'America/New_York')

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

// #region agent log
process.on('unhandledRejection', (reason, promise) => {
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:100',message:'Unhandled promise rejection',data:{reason:reason?.toString(),promiseType:typeof promise},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
});

process.on('uncaughtException', (error) => {
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:104',message:'Uncaught exception',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
});
// #endregion

// #region agent log
let serverStarted = false;
try {
    app.listen(port, () => {
        serverStarted = true;
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:112',message:'Server started successfully',data:{port:port,listening:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        console.log(`Example app listening on port ${port}!`);
    });
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:115',message:'Server listen called',data:{port:port,serverStarted:serverStarted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
} catch (error) {
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:117',message:'Server startup error',data:{errorName:error?.name,errorMessage:error?.message,errorCode:error?.code,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    throw error;
}
// #endregion