const questionTypeRouter = require('express').Router()
const { addQuestionType, getQuestionType } = require('./controller/questionType.controller')
const { adminAuth } = require('../../middleware/auth')

questionTypeRouter.post('/questionType/addQuestionType', adminAuth, addQuestionType)
questionTypeRouter.get('/questionType/getQuestionType/:typeOfExamID', getQuestionType)

module.exports = questionTypeRouter