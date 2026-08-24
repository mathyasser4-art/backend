const userRouter = require('express').Router()
const resendVerificationCode = require('./controller/resendVerificationCode.controller')
const verificationEmail = require('./controller/verificationEmail.controller')
const getUsers = require('./controller/getUsers.controller')
const { resetPasswordCode, checkresetPasswordCode, resetPassword } = require('./controller/resetPassword.controller')
const userAuthroize = require('./controller/userAuthorize.controller')

const { getShopItems, buyItem, equipItem, tipStudent } = require('./controller/economy.controller')
const { generalAuth } = require('../../middleware/auth')
const updateProfile = require('./controller/updateProfile.controller')

userRouter.put('/user/updateProfile', generalAuth, updateProfile)

userRouter.post('/user/resendVerificationCode', resendVerificationCode)
userRouter.put('/user/verificationEmail', verificationEmail)
userRouter.post('/user/resetPasswordCode', resetPasswordCode)
userRouter.put('/user/checkresetPasswordCode', checkresetPasswordCode)
userRouter.put('/user/resetPassword', resetPassword)
userRouter.get('/user/userAuthorize/:userToken', userAuthroize)
userRouter.get('/user/get', getUsers)

// Economy Endpoints
userRouter.get('/user/shop', getShopItems)
userRouter.post('/user/buyItem', generalAuth, buyItem)
userRouter.post('/user/equipItem', generalAuth, equipItem)
userRouter.post('/user/tipStudent', generalAuth, tipStudent)

module.exports = userRouter
