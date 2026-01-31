const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { email, password, cPassword } = req.body
        const findUser = await userModel.findOne({ email })
        if (!findUser) {
            if (password == cPassword) {
                const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
                req.body.verify = true // Auto-verify new users - no email verification needed
                const addUser = new userModel(req.body)
                const userData = await addUser.save()
                if (userData) {
                    // Generate token for immediate login
                    const userToken = jwt.sign({ id: userData._id }, process.env.TOKEN_SECRET_KEY);
                    res.status(201).json({ 
                        message: 'success',
                        userToken,
                        userName: userData.userName,
                        role: userData.role
                    })
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