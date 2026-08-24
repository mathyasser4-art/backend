const questionRouter = require('express').Router()
const { 
    addQuestion, 
    updateAnswerPic, 
    updateQuestion, 
    checkTheAnswer, 
    getQuestionDetails, 
    deleteQuestion, 
    addGraphQuestion, 
    updateAutoCorrect, 
    getQuestionsByLevel,
    reportQuestionError,
    getSchoolQuestionReports,
    resolveQuestionReport
} = require('./controller/question.controller')
const upload = require('../../middleware/handleMulter')
const { teacherAuth, schoolAuth, optionalAuth } = require('../../middleware/auth')

questionRouter.post('/question/addQuestion', optionalAuth, upload.single("image"), addQuestion)
questionRouter.put('/question/updateAnswerPic/:questionID', upload.single("image"), updateAnswerPic)
questionRouter.put('/question/updateQuestion/:questionID', optionalAuth, upload.single("image"), updateQuestion)
questionRouter.put('/question/addGraphQuestion/:questionID', upload.array("image"), addGraphQuestion)
questionRouter.post('/question/checkTheAnswer/:questionID', checkTheAnswer)
questionRouter.get('/question/getQuestionDetails/:questionID', getQuestionDetails)
questionRouter.delete('/question/deleteQuestion/:questionID/:chapterID', optionalAuth, deleteQuestion)
questionRouter.put('/question/updateAutoCorrect/:questionID', updateAutoCorrect)
questionRouter.get('/question/level/:level', getQuestionsByLevel)

// Question reporting endpoints
questionRouter.post('/question/report-error', teacherAuth, reportQuestionError)
questionRouter.get('/question/reports', schoolAuth, getSchoolQuestionReports)
questionRouter.post('/question/report-resolve/:reportID', schoolAuth, resolveQuestionReport)

module.exports = questionRouter

