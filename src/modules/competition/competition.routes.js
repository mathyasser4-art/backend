const competitionRouter = require('express').Router()
const {
    createCompetition,
    getTeacherCompetitions,
    getCompetitionDetails,
    getCompetitionStatus,
    joinCompetition,
    startCompetition,
    updateLiveScore,
    finishCompetition,
    removeParticipant,
    triggerMathRacerEvent
} = require('./controller/competition.controller')
const { teacherAuth, studentAuth, optionalAuth } = require('../../middleware/auth')

// Teacher endpoints
competitionRouter.post('/competition/create', teacherAuth, createCompetition)
competitionRouter.get('/competition/teacher-list', teacherAuth, getTeacherCompetitions)
competitionRouter.post('/competition/:competitionId/start', teacherAuth, startCompetition)
competitionRouter.post('/competition/:competitionId/finish', teacherAuth, finishCompetition)
competitionRouter.post('/competition/:competitionId/remove-participant', teacherAuth, removeParticipant)

// Student endpoints
competitionRouter.post('/competition/:competitionId/join', optionalAuth, joinCompetition)
competitionRouter.post('/competition/:competitionId/score', optionalAuth, updateLiveScore)

// Shared endpoints (accessible by both teachers and students)
competitionRouter.get('/competition/:competitionId/details', optionalAuth, getCompetitionDetails)
// Lightweight polling fallback used when a real-time (Pusher) event is missed
competitionRouter.get('/competition/:competitionId/status', optionalAuth, getCompetitionStatus)
competitionRouter.post('/competition/mathracer/trigger', triggerMathRacerEvent)

module.exports = competitionRouter
