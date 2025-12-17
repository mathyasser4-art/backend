const userModel = require('../../../../DB/models/user.model')
const sendEmail = require('../../../services/sendEmail')
const generateCode = require('../../../services/generateVerificationCode')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const findUser = await userModel.findOne({ $or: [{ 'email': email }, { 'userName': email }] })
        if (findUser) {
            if (!findUser.verify) {
                findUser.verificationCode = generateCode()
                await findUser.save()
                const emailMessage = `<div style="direction: rtl; padding: 10px 30px;">
                    <p style="font-size: 20px; font-weight: bold; color: #000;">Welcome, ${findUser.fullName}. We are happy that you have registered with us. Your account verification code is</p>
                    <p style="font-size: 40px; font-weight: bold; color: #000;">${findUser.verificationCode}</p>
                    </div>`
                sendEmail(email, emailMessage, 'Account verification', 'Practice Papers')
                res.json({ message: 'this account is not verify check your email to get your code verification', isVerify: false })
            } else {
                const checkPassword = await bcrypt.compare(password, findUser.password)
                if (checkPassword) {
                    const userToken = jwt.sign({ id: findUser._id }, process.env.TOKEN_SECRET_KEY);
                    res.json({ message: 'success', userToken, userName: findUser.userName, role: findUser.role })
                } else {
                    res.json({ message: 'wrong password' })
                }
            }
        } else {
            res.json({ message: 'this email or username is not registered' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = login