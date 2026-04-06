const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const findUser = await userModel.findOne({ email })
        if (findUser) {
            if (findUser.role == 'Admin') {
                const checkPassword = bcrypt.compareSync(password, findUser.password)
                if (checkPassword) {
                    const userToken = jwt.sign({ id: findUser._id }, process.env.TOKEN_SECRET_KEY);
                    res.json({ message: 'success', userToken })
                } else {
                    res.json({ message: 'wrong password' })
                }
            } else {
                res.json({ message: 'You do not have access to complete this operation' })
            }
        } else {
            res.json({ message: 'this email is not registered' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = login