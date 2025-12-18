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
  'https://practice-papers.com',
  'https://practicepapers.online',
  'https://frontend-pearl-ten-60.vercel.app',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'auth-token']
};

app.use(cors(corsOptions));
const port = process.env.PORT || 3000
app.use(express.json())
const connectionDB = require('./DB/connection')
connectionDB()

// Rate limiting sitting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});
app.use(limiter);

const { authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter } = require('./router/allRoutes')
app.use(authRouter, userRouter, systemRouter, questionTypeRouter, unitRouter, chapterRouter, questionRouter, adminRouter, subjectRouter, classRouter, schoolRouter, schoolSubjectRouter, teacherRouter, studentRouter, assignmentRouter, answerRouter, itRouter, supervisorRouter)
const request = require('request')
const CronJob = require('cron').CronJob;

// new CronJob('*/10 * * * *', function () {
//     request('https://practice-papers.onrender.com/', function (error, response, body) {
//         if (!error && response.statusCode == 200) {
//             console.log('Wake up the server')
//         }
//     })
// }, null, true, 'America/New_York')

app.get('/', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))