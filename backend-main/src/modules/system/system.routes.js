const systemRouter = require('express').Router()
const { addSystem, getAllSystem, updateSystem } = require('./controller/system.controller')

systemRouter.post('/system/addSystem', addSystem)
systemRouter.get('/system/getAllSystem', getAllSystem)
systemRouter.get('/system/getAllSystem/:questionTypeID', getAllSystem)
systemRouter.put('/system/updateSystem/:systemID', updateSystem)

module.exports = systemRouter