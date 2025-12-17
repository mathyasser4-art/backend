const supervisorRouter = require('express').Router()
const { addSupervisor, getSupervisor, updateSupervisor, deleteSupervisor, getAllTeachers, supervisorDeatails, getAssignment } = require('./controller/supervisor.controller')
const { itAuth, supervisorAuth } = require('../../middleware/auth')

supervisorRouter.post('/supervisor/addSupervisor', itAuth, addSupervisor)
supervisorRouter.put('/supervisor/updateSupervisor/:supervisorID', itAuth, updateSupervisor)
supervisorRouter.get('/supervisor/getSupervisor', itAuth, getSupervisor)
supervisorRouter.get('/supervisor/getAllTeachers', itAuth, getAllTeachers)
supervisorRouter.delete('/supervisor/deleteSupervisor/:supervisorID', itAuth, deleteSupervisor)
supervisorRouter.get('/supervisor/supervisorDeatails', supervisorAuth, supervisorDeatails)
supervisorRouter.get('/supervisor/getAssignment/:teacherID', supervisorAuth, getAssignment)

module.exports = supervisorRouter