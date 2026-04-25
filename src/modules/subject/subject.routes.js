const subjectRouter = require('express').Router()
const { addSubject, updateSubject } = require('./controller/subject.controller')

subjectRouter.post('/subject/addSubject', addSubject)
subjectRouter.put('/subject/updateSubject/:subjectID', updateSubject)

module.exports = subjectRouter
