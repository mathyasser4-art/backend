const userModel = require('../../../../DB/models/user.model');
const jwt = require('jsonwebtoken');

const userAuthroize = async (req, res) => {
    try {
        const { userToken } = req.params;
        const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY);
        const findUser = await userModel.findById(id)
            .select('userName email phone password role verify createdBy coins unlockedItems currentAvatarBorder currentCarSkin currentTankSkin trialStartedAt trialEndsAt isPaid disable')
            .populate({ path: 'createdBy', select: 'userName isPaid' });
        if (findUser) {
            if (findUser.verify) {
                let remainingDays = null;
                if (findUser.trialEndsAt) {
                    const diffMs = new Date(findUser.trialEndsAt).getTime() - Date.now();
                    remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                }
                const userObj = findUser.toObject();
                userObj.remainingDays = remainingDays;
                // If the user's school / createdBy account is marked as paid, user is considered paid
                if (findUser.createdBy && findUser.createdBy.isPaid) {
                    userObj.isPaid = true;
                }
                res.json({ message: 'success', userInfo: userObj, remainingDays });
            } else {
                res.json({ message: 'this email is not verify' });
            }
        } else {
            res.json({ message: 'this email is not founed' });
        }
    } catch (error) {
        res.json({ message: error.message });
    }
};

module.exports = userAuthroize;