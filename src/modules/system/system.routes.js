const systemRouter = require('express').Router()
const { addSystem, getAllSystem, updateSystem } = require('./controller/system.controller')
const { adminAuth } = require('../../middleware/auth')

systemRouter.post('/system/addSystem', adminAuth, addSystem)
systemRouter.get('/system/getAllSystem', getAllSystem)
systemRouter.get('/system/getAllSystem/:questionTypeID', getAllSystem)
systemRouter.put('/system/updateSystem/:systemID', adminAuth, updateSystem)

module.exports = systemRouter