const userModel = require('../../../../DB/models/user.model')
const jwt = require('jsonwebtoken');

const userAuthroize = async (req, res) => {
    try {
        const { userToken } = req.params
        const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
        const findUser = await userModel.findById(id).select('userName email password role verify createdBy').populate({ path: 'createdBy', select: 'userName' })
        if (findUser) {
            if (findUser.verify) {
                res.json({ message: 'success', userInfo: findUser })
            } else {
                res.json({ message: 'this email is not verify' })
            }
        } else {
            res.json({ message: 'this email is not founed' })
        }
    } catch (error) {
        res.json({ message: error.message })
    }
}

module.exports = userAuthroize