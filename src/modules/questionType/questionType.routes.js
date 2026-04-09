const questionTypeRouter = require('express').Router()
const { addQuestionType, getQuestionType } = require('./controller/questionType.controller')

questionTypeRouter.post('/questionType/addQuestionType', addQuestionType)
questionTypeRouter.get('/questionType/getQuestionType/:typeOfExamID', getQuestionType)

module.exports = questionTypeRouter
