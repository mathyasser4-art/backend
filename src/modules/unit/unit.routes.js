const unitRouter = require('express').Router()
const { addUnit, getUnit, updateUnit, deleteUnit } = require('./controller/unit.controller')

unitRouter.post('/unit/addUnit', addUnit)
unitRouter.get('/unit/getUnit/:questionTypeID/:subjectID', getUnit)
unitRouter.put('/unit/updateUnit/:questionTypeID/:unitID/:subjectID', updateUnit)
unitRouter.delete('/unit/deleteUnit/:questionTypeID/:unitID/:subjectID', deleteUnit)

module.exports = unitRouter
