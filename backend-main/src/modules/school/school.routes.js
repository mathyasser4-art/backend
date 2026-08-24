const schoolRouter = require('express').Router()
const { addSchool, getSchool, updateSchool, deleteSchool, disableSchool, registerTeachers } = require('./controller/school.controller')
const { itOrTeacherAuth } = require('../../middleware/auth')

schoolRouter.post('/school/addSchool', addSchool)
schoolRouter.post('/school/registerTeachers', itOrTeacherAuth, registerTeachers)
schoolRouter.put('/school/updateSchool/:schoolID', updateSchool)
schoolRouter.get('/school/getSchool', getSchool)
schoolRouter.delete('/school/deleteSchool/:schoolID', deleteSchool)
schoolRouter.put('/school/disableSchool/:schoolID', disableSchool)

module.exports = schoolRouter
