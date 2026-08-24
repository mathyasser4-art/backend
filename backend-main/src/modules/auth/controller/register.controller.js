const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { userName, email, password, cPassword, academy } = req.body;
        
        if (!userName || !email || !password || !cPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (password !== cPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        if (!academy) {
            return res.status(400).json({ message: 'Academy is required' });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const school = await userModel.findOne({ role: 'School', userName: academy });
        if (!school) {
            return res.status(400).json({ message: `Academy "${academy}" not found in database. Please contact administrator.` });
        }

        const saltRounds = parseInt(process.env.SALTROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newTeacher = new userModel({
            userName,
            email,
            password: hashedPassword,
            role: 'Teacher',
            createdBy: school._id,
            maxStudents: 100,
            verify: true
        });

        await newTeacher.save();

        const userToken = jwt.sign({ id: newTeacher._id }, process.env.TOKEN_SECRET_KEY);

        return res.json({
            message: 'success',
            userToken,
            role: newTeacher.role,
            userName: newTeacher.userName
        });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

module.exports = register