const userModel = require('../../../../DB/models/user.model')
const sendEmail = require('../../../services/sendEmail')
const generateCode = require('../../../services/generateVerificationCode')
const bcrypt = require('bcryptjs');

const resetPasswordCode = async (req, res) => {
    try {
        const { email } = req.body
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            findUser.resetPasswordCode = generateCode()
            await findUser.save()
            const emailMessage = `<div style="direction: rtl; padding: 10px 30px;">
                    <p style="font-size: 20px; font-weight: bold; color: #000;">Welcome ${findUser.userName}, you have submitted a request to reset your password. Your verification code is</p>
                    <p style="font-size: 40px; font-weight: bold; color: #000;">${findUser.resetPasswordCode}</p>
                    </div>`
            sendEmail(email, emailMessage, 'Password reset request', 'Practice Papers')
            res.json({ message: 'success' })
        } else {
            res.json({ message: 'this email is not founed' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const checkresetPasswordCode = async (req, res) => {
    try {
        const { email, resetPasswordCode } = req.body
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            if (findUser.resetPasswordCode == resetPasswordCode) {
                findUser.checkresetPasswordCode = true
                await findUser.save()
                res.json({ message: 'success' })
            } else {
                res.json({ message: 'Invalid verification code' })
            }
        } else {
            res.json({ message: 'this email is not founed' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { email, password, cPassword } = req.body;
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            if (findUser.checkresetPasswordCode) {
                if (password == cPassword) {
                    const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                    findUser.password = hashPassword
                    findUser.checkresetPasswordCode = false
                    await findUser.save()
                    res.json({ message: 'success' })
                } else {
                    res.json({ message: 'the password is does not match confirm password' })
                }
            } else {
                res.json({ message: 'Submit a password reset request first so that the verification code will be sent to you' })
            }
        } else {
            res.json({ message: 'this email is not founed' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { resetPasswordCode, checkresetPasswordCode, resetPassword }