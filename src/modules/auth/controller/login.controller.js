const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const findUser = await userModel.findOne({ email });
        if (!findUser) {
            return res.json({ message: 'This email is not registered' });
        }

        if (!findUser.verify) {
            return res.json({ message: 'Please verify your account first' });
        }

        if (findUser.disable) {
            return res.json({ message: 'This account has been disabled. Please contact support' });
        }

        const isPasswordMatch = await bcrypt.compare(password, findUser.password);
        if (!isPasswordMatch) {
            return res.json({ message: 'Incorrect password' });
        }

        const userToken = jwt.sign({ id: findUser._id }, process.env.TOKEN_SECRET_KEY);
        res.json({
            message: 'success',
            userToken,
            userName: findUser.userName,
            role: findUser.role,
            userID: findUser._id
        });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

module.exports = login;
