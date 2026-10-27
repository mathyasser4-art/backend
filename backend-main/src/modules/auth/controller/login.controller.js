const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ message: 'Incorrect username or password' });
        }

        const cleanInput = email.toString().trim();
        const cleanPhone = cleanInput.replace(/[^\d+]/g, '');

        const orConditions = [
            { email: cleanInput.toLowerCase() },
            { userName: cleanInput },
            { email: cleanInput }
        ];
        if (cleanPhone && cleanPhone.length >= 7) {
            orConditions.push({ phone: cleanPhone });
            orConditions.push({ phone: cleanInput });
        }

        const query = { $or: orConditions };

        const findUser = await userModel.findOne(query)
            .populate('createdBy')
            .populate({ path: 'subject', select: 'schoolSubjectName' })
            .populate({ path: 'assignedSystemList', select: 'systemName' });
        if (!findUser) {
            return res.json({ message: 'Incorrect username or password' });
        }

        if (!findUser.verify) {
            return res.json({ message: 'Please verify your account first' });
        }

        if (findUser.disable) {
            return res.json({ message: 'This account has been disabled. Please contact support' });
        }

        const isPasswordMatch = await bcrypt.compare(password, findUser.password);
        if (!isPasswordMatch) {
            return res.json({ message: 'Incorrect username or password' });
        }

        const { checkAndApplyTopsorobanTrial } = require('../../../services/topsorobanTrial.service');
        const trialResult = await checkAndApplyTopsorobanTrial(findUser);
        if (trialResult.isExpired) {
            return res.json({ message: trialResult.message || 'Your free trial for Topsoroban has expired. Please contact support or subscribe to unlock your account.' });
        }

        let remainingDays = null;
        if (findUser.trialEndsAt) {
            const diffMs = new Date(findUser.trialEndsAt).getTime() - Date.now();
            remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        const { generateUniqueReferralCode, getUnlockDetails } = require('../../../services/referral.service');
        if (!findUser.referralCode) {
            findUser.referralCode = await generateUniqueReferralCode();
            await findUser.save();
        }
        const unlockInfo = getUnlockDetails(findUser);

        const secretKey = process.env.TOKEN_SECRET_KEY || 'pracYas09_egypt_schools_token_key_2026';
        const userToken = jwt.sign({ id: findUser._id }, secretKey);
        res.json({
            message: 'success',
            userToken,
            userName: findUser.userName,
            role: findUser.role,
            userID: findUser._id,
            phone: findUser.phone,
            createdBy: findUser.createdBy,
            subject: findUser.subject,
            assignedSystemList: findUser.assignedSystemList || [],
            trialStartedAt: findUser.trialStartedAt,
            trialEndsAt: findUser.trialEndsAt,
            isPaid: findUser.isPaid,
            remainingDays,
            referralCode: unlockInfo.referralCode,
            referralCount: unlockInfo.referralCount,
            featuresUnlockedUntil: unlockInfo.unlockedUntil,
            sharePassExpiresAt: unlockInfo.sharePassExpiresAt,
            isFeaturesUnlocked: unlockInfo.isUnlocked,
            featuresRemainingDays: unlockInfo.daysRemaining
        });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

module.exports = login;
