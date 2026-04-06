const userRouter = require('express').Router()
const resendVerificationCode = require('./controller/resendVerificationCode.controller')
const verificationEmail = require('./controller/verificationEmail.controller')
const getUsers = require('./controller/getUsers.controller')
const { resetPasswordCode, checkresetPasswordCode, resetPassword } = require('./controller/resetPassword.controller')
const userAuthroize = require('./controller/userAuthorize.controller')
const { adminAuth } = require('../../middleware/auth')

userRouter.post('/user/resendVerificationCode', resendVerificationCode)
userRouter.put('/user/verificationEmail', verificationEmail)
userRouter.post('/user/resetPasswordCode', resetPasswordCode)
userRouter.put('/user/checkresetPasswordCode', checkresetPasswordCode)
userRouter.put('/user/resetPassword', resetPassword)
userRouter.get('/user/userAuthorize/:userToken', userAuthroize)
userRouter.get('/user/get', adminAuth, getUsers)

module.exports = userRouter