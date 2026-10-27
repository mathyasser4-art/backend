const userModel = require('../../../../DB/models/user.model');
const jwt = require('jsonwebtoken');
const { generateUniqueReferralCode, getUnlockDetails } = require('../../../services/referral.service');

// Helper to extract user from Authorization header or req.body / query
async function getAuthenticatedUser(req) {
    try {
        const authHeader = req.headers.authorization || req.headers.token || req.body.token || req.query.token;
        if (!authHeader) return null;
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
        if (!decoded || !decoded.id) return null;
        return await userModel.findById(decoded.id);
    } catch (e) {
        return null;
    }
}

/**
 * GET /user/referral/status
 */
const getReferralStatus = async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!user.referralCode) {
            user.referralCode = await generateUniqueReferralCode();
            await user.save();
        }

        const details = getUnlockDetails(user);

        return res.json({
            message: 'success',
            referralCode: details.referralCode,
            referralLink: `https://abacusheroes.com/register?role=Teacher&ref=${details.referralCode}`,
            isUnlocked: details.isUnlocked,
            unlockedUntil: details.unlockedUntil,
            sharePassExpiresAt: details.sharePassExpiresAt,
            daysRemaining: details.daysRemaining,
            referralCount: details.referralCount
        });
    } catch (error) {
        console.error('Error in getReferralStatus:', error);
        return res.status(500).json({ message: error.message });
    }
};

/**
 * POST /user/referral/claim-share-pass
 * Gives a 48-hour instant pass when user clicks "Share on WhatsApp"
 */
const claimSharePass = async (req, res) => {
    try {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const now = new Date();
        const passDurationMs = 48 * 60 * 60 * 1000; // 48 hours
        const newPassExpiry = new Date(now.getTime() + passDurationMs);

        // Only extend if current sharePass is shorter than 48 hours from now
        if (!user.sharePassExpiresAt || new Date(user.sharePassExpiresAt) < newPassExpiry) {
            user.sharePassExpiresAt = newPassExpiry;
            await user.save();
        }

        const details = getUnlockDetails(user);

        return res.json({
            message: 'success',
            sharePassExpiresAt: user.sharePassExpiresAt,
            isUnlocked: details.isUnlocked,
            daysRemaining: details.daysRemaining
        });
    } catch (error) {
        console.error('Error in claimSharePass:', error);
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getReferralStatus,
    claimSharePass
};
