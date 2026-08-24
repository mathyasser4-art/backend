const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs')

const updateProfile = async (req, res) => {
    try {
        const userID = req.userData._id;
        const { userName, password } = req.body;

        if (!userName) {
            return res.json({ message: "Username is required" });
        }

        const updateData = { userName };

        if (password && password.trim() !== '') {
            const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS) || 10);
            updateData.password = hashPassword;
        }

        const updatedUser = await userModel.findByIdAndUpdate(userID, updateData, { new: true });

        if (!updatedUser) {
            return res.json({ message: "User not found" });
        }

        res.json({ message: "success", userName: updatedUser.userName });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
}

module.exports = updateProfile;
