const userModel = require('../../../../DB/models/user.model')

const getUsers = async (req, res) => {
    const { page = 1 } = req.query;
    const limit = 20; // Number of items per page
    const skip = (page - 1) * limit;

    try {
        const findUser = await userModel.find({ role: 'User' }).select('userName email role verify').sort({ _id: -1 }).skip(skip).limit(limit)
        if (findUser.length == 0) {
            return res.json({ message: 'There is no any user yer' })
        }

        const totalUsers = await userModel.countDocuments({ role: 'User' }); // Get total users

        res.json({
            message: 'success',
            users: findUser,
            page: parseInt(page),
            totalPages: Math.ceil(totalUsers / limit),
            totalItems: totalUsers,
        });
    } catch (error) {
        res.json({ message: error.message })
    }
}

module.exports = getUsers;