const subjectRouter = require('express').Router()
const { addSubject, updateSubject } = require('./controller/subject.controller')
const { adminAuth } = require('../../middleware/auth')

subjectRouter.post('/subject/addSubject', adminAuth, addSubject)
subjectRouter.put('/subject/updateSubject/:subjectID', adminAuth, updateSubject)

module.exports = subjectRouter