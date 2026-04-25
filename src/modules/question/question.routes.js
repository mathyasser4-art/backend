const questionRouter = require('express').Router()
const { addQuestion, updateAnswerPic, updateQuestion, checkTheAnswer, getQuestionDetails, deleteQuestion, addGraphQuestion, updateAutoCorrect, getQuestionsByLevel } = require('./controller/question.controller')
const upload = require('../../middleware/handleMulter')

questionRouter.post('/question/addQuestion', upload.single("image"), addQuestion)
questionRouter.put('/question/updateAnswerPic/:questionID', upload.single("image"), updateAnswerPic)
questionRouter.put('/question/updateQuestion/:questionID', upload.single("image"), updateQuestion)
questionRouter.put('/question/addGraphQuestion/:questionID', upload.array("image"), addGraphQuestion)
questionRouter.post('/question/checkTheAnswer/:questionID', checkTheAnswer)
questionRouter.get('/question/getQuestionDetails/:questionID', getQuestionDetails)
questionRouter.delete('/question/deleteQuestion/:questionID/:chapterID', deleteQuestion)
questionRouter.put('/question/updateAutoCorrect/:questionID', updateAutoCorrect)
questionRouter.get('/question/level/:level', getQuestionsByLevel)

module.exports = questionRouter
