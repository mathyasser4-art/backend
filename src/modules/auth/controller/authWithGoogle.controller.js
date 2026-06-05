const userModel = require('../../../../DB/models/user.model')
const jwt = require('jsonwebtoken');
const axios = require('axios');

const authWithGoogle = async (req, res) => {
    try {
        const { access_token } = req.body
        const resData = await axios.get(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
        )
        const { data } = resData
        if (data) {
            const { email_verified, email } = data
            if (email_verified == true) {
                const findUser = await userModel.findOne({ email })
                if (!findUser) {
                    res.status(400).json({ message: 'No account found with this email. Your account must be pre-created by your school or teacher before logging in.' })
                } else {
                    const userToken = jwt.sign({ id: findUser._id }, process.env.TOKEN_SECRET_KEY);
                    res.json({ message: 'success', userToken })
                }
            } else {
                res.json({ message: 'your google account is not verify' })
            }
        } else {
            res.json({ message: 'this access token is expired' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = authWithGoogle