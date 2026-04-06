const userModel = require('../../../../DB/models/user.model')
const sendEmail = require('../../../services/sendEmail')
const generateCode = require('../../../services/generateVerificationCode')

const resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            findUser.verificationCode = generateCode()
            await findUser.save()
            const emailMessage = `<div style="direction: rtl; padding: 10px 30px;">
                    <p style="font-size: 20px; font-weight: bold; color: #000;">Welcome, ${findUser.userName}. We are happy that you have registered with us. Your account verification code is</p>
                    <p style="font-size: 40px; font-weight: bold; color: #000;">${findUser.verificationCode}</p>
                    </div>`
            sendEmail(email, emailMessage, 'Account verification', 'Practice Papers')
            res.json({ message: 'success' })
        } else {
            res.json({ message: 'this email is not founed' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = resendVerificationCode