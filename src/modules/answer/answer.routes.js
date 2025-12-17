const answerRouter = require('express').Router()
const { checkAssinmentAnswer, getAssignmentAnswer, getResult, getStudentOwnReport, debugAnswerDocument } = require('./controller/answer.controller')
const upload = require('../../middleware/handleMulter')
const { studentAuth, teacherAuth } = require('../../middleware/auth')

answerRouter.post('/answer/checkAnswer/:questionID/:assignmentID', studentAuth, upload.single("image"), checkAssinmentAnswer)
answerRouter.get('/answer/getAnswer/:studentID/:assignmentID', teacherAuth, getAssignmentAnswer)
answerRouter.get('/answer/getMyReport/:assignmentID', studentAuth, getStudentOwnReport)
// Manual grading endpoint removed - all questions are now auto-graded
// answerRouter.put('/answer/correctAnswer/:studentID/:assignmentID/:questionID', teacherAuth, correctAnswer)
answerRouter.get('/answer/getResult/:assignmentID', studentAuth, getResult)

// Debug endpoint - can be accessed by both teacher and student
answerRouter.get('/answer/debug/:studentID/:assignmentID', debugAnswerDocument)

module.exports = answerRouter