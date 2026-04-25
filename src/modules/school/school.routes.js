const schoolRouter = require('express').Router()
const { addSchool, getSchool, updateSchool, deleteSchool, disableSchool } = require('./controller/school.controller')

schoolRouter.post('/school/addSchool', addSchool)
schoolRouter.put('/school/updateSchool/:schoolID', updateSchool)
schoolRouter.get('/school/getSchool', getSchool)
schoolRouter.delete('/school/deleteSchool/:schoolID', deleteSchool)
schoolRouter.put('/school/disableSchool/:schoolID', disableSchool)

module.exports = schoolRouter
