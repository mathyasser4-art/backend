const classRouter = require('express').Router()
const { addClass, getAllClass, updateClass, removeClass, getStudent, addMultipleClasses } = require('./controller/class.controller')
const { itOrTeacherAuth } = require('../../middleware/auth')

classRouter.post('/class/addClass', itOrTeacherAuth, addClass)
classRouter.post('/class/addMultipleClasses', itOrTeacherAuth, addMultipleClasses)
classRouter.put('/class/updateClass/:classID', itOrTeacherAuth, updateClass)
classRouter.get('/class/getAllClass', itOrTeacherAuth, getAllClass)
classRouter.delete('/class/removeClass/:classID', itOrTeacherAuth, removeClass)
classRouter.get('/class/getStudent/:classID', itOrTeacherAuth, getStudent)

module.exports = classRouter