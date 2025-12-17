const unitRouter = require('express').Router()
const { addUnit, getUnit, updateUnit, deleteUnit } = require('./controller/unit.controller')
const { adminAuth } = require('../../middleware/auth')

unitRouter.post('/unit/addUnit', adminAuth, addUnit)
unitRouter.get('/unit/getUnit/:questionTypeID/:subjectID', getUnit)
unitRouter.put('/unit/updateUnit/:questionTypeID/:unitID/:subjectID', adminAuth, updateUnit)
unitRouter.delete('/unit/deleteUnit/:questionTypeID/:unitID/:subjectID', adminAuth, deleteUnit)

module.exports = unitRouter