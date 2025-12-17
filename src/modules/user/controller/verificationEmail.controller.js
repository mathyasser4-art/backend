const userModel = require('../../../../DB/models/user.model')

const verificationEmail = async (req, res) => {
    try {
        const { email, verificationCode } = req.body
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            if (findUser.verificationCode == verificationCode) {
                findUser.verify = true
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

module.exports = verificationEmail