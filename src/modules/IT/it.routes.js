const itRouter = require('express').Router()
const { addIT, getIT, updateIT, deleteIT } = require('./controller/it.controller')
const { schoolAuth } = require('../../middleware/auth')

itRouter.post('/it/addIT', schoolAuth, addIT)
itRouter.put('/it/updateIT/:itID', schoolAuth, updateIT)
itRouter.get('/it/getIT', schoolAuth, getIT)
itRouter.delete('/it/deleteIT/:itID', schoolAuth, deleteIT)

module.exports = itRouter