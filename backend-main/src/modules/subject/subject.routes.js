const subjectRouter = require('express').Router()
const { addSubject, updateSubject, deleteSubject } = require('./controller/subject.controller')

subjectRouter.post('/subject/addSubject', addSubject)
subjectRouter.put('/subject/updateSubject/:subjectID', updateSubject)
subjectRouter.delete('/subject/deleteSubject/:subjectID', deleteSubject)

module.exports = subjectRouter
