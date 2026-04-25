const authRouter = require('express').Router()
const register = require('./controller/register.controller')
const login = require('./controller/login.controller')
const authWithGoogle = require('./controller/authWithGoogle.controller')

authRouter.post('/auth/register', register)
authRouter.post('/auth/login', login)
authRouter.post('/auth/google', authWithGoogle)

module.exports = authRouter