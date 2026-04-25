const schoolSubjectRouter = require('express').Router()
const { addSchoolSubject, updateSchoolSubject, removeSchoolSubject, getSchoolSubject } = require('./controller/schoolSubject.controler')
const { itAuth } = require('../../middleware/auth')

schoolSubjectRouter.get('/schoolSubject/getSchoolSubject', itAuth, getSchoolSubject)
schoolSubjectRouter.post('/schoolSubject/addSchoolSubject', itAuth, addSchoolSubject)
schoolSubjectRouter.put('/schoolSubject/updateSchoolSubject/:subjectID', itAuth, updateSchoolSubject)
schoolSubjectRouter.delete('/schoolSubject/removeSchoolSubject/:subjectID', itAuth, removeSchoolSubject)

module.exports = schoolSubjectRouter