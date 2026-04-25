const classRouter = require('express').Router()
const { addClass, getAllClass, updateClass, removeClass, getStudent } = require('./controller/class.controller')
const { itAuth } = require('../../middleware/auth')

classRouter.post('/class/addClass', itAuth, addClass)
classRouter.put('/class/updateClass/:classID', itAuth, updateClass)
classRouter.get('/class/getAllClass', itAuth, getAllClass)
classRouter.delete('/class/removeClass/:classID', itAuth, removeClass)
classRouter.get('/class/getStudent/:classID', itAuth, getStudent)

module.exports = classRouter