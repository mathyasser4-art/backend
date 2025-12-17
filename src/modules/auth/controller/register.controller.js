const userModel = require('../../../../DB/models/user.model')
const sendEmail = require('../../../services/sendEmail')
const generateCode = require('../../../services/generateVerificationCode')
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
    try {
        const { email, password, cPassword } = req.body
        const findUser = await userModel.findOne({ email })
        if (!findUser) {
            if (password == cPassword) {
                const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
                req.body.verificationCode = generateCode()
                const addUser = new userModel(req.body)
                const userData = await addUser.save()
                if (userData) {
                    const emailMessage = `<div style="direction: rtl; padding: 10px 30px;">
                    <p style="font-size: 20px; font-weight: bold; color: #000;">Welcome, ${userData.userName}. We are happy that you have registered with us. Your account verification code is</p>
                    <p style="font-size: 40px; font-weight: bold; color: #000;">${userData.verificationCode}</p>
                    </div>`                    
                    sendEmail(email, emailMessage, 'Account verification', 'Practice Papers')
                    res.status(201).json({ message: 'success' })
                } else {
                    res.json({ message: 'Error...This account has not been registered to our servers. Please try again' })
                }
            } else {
                res.json({ message: 'the password is does not match confirm password' })
            }
        } else {
            res.json({ message: 'this email is already register' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = register