const adminRouter = require('express').Router()
const login = require('./controller/admin.controller')

adminRouter.post('/admin/login', login)

module.exports = adminRouter