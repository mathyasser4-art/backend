const schoolRouter = require('express').Router()
const { addSchool, getSchool, updateSchool, deleteSchool, disableSchool } = require('./controller/school.controller')
const { adminAuth } = require('../../middleware/auth')

schoolRouter.post('/school/addSchool', adminAuth, addSchool)
schoolRouter.put('/school/updateSchool/:schoolID', adminAuth, updateSchool)
schoolRouter.get('/school/getSchool', adminAuth, getSchool)
schoolRouter.delete('/school/deleteSchool/:schoolID', adminAuth, deleteSchool)
schoolRouter.put('/school/disableSchool/:schoolID', adminAuth, disableSchool)

module.exports = schoolRouter