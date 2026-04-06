const questionRouter = require('express').Router()
const { addQuestion, updateAnswerPic, updateQuestion, checkTheAnswer, getQuestionDetails, deleteQuestion, addGraphQuestion, updateAutoCorrect } = require('./controller/question.controller')
const upload = require('../../middleware/handleMulter')
const { adminAuth } = require('../../middleware/auth')

questionRouter.post('/question/addQuestion', adminAuth, upload.single("image"), addQuestion)
questionRouter.put('/question/updateAnswerPic/:questionID', adminAuth, upload.single("image"), updateAnswerPic)
questionRouter.put('/question/updateQuestion/:questionID', adminAuth, upload.single("image"), updateQuestion)
questionRouter.put('/question/addGraphQuestion/:questionID', adminAuth, upload.array("image"), addGraphQuestion)
questionRouter.post('/question/checkTheAnswer/:questionID', checkTheAnswer)
questionRouter.get('/question/getQuestionDetails/:questionID', getQuestionDetails)
questionRouter.delete('/question/deleteQuestion/:questionID/:chapterID', adminAuth, deleteQuestion)
questionRouter.put('/question/updateAutoCorrect/:questionID', adminAuth, updateAutoCorrect)

module.exports = questionRouter