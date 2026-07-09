const systemRouter = require('express').Router()
const { addSystem, getAllSystem, updateSystem, deleteSystem } = require('./controller/system.controller')

systemRouter.post('/system/addSystem', addSystem)
systemRouter.get('/system/getAllSystem', getAllSystem)
systemRouter.get('/system/getAllSystem/:questionTypeID', getAllSystem)
systemRouter.put('/system/updateSystem/:systemID', updateSystem)
systemRouter.delete('/system/deleteSystem/:systemID', deleteSystem)

module.exports = systemRouter