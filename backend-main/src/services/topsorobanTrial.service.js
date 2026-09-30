const userModel = require('../../DB/models/user.model');

// Lockout cutoff: October 1, 2026 00:00:00 (UTC+3 Egypt timezone)
const LOCKOUT_CUTOFF = new Date('2026-10-01T00:00:00+03:00');

/**
 * Checks if a user or their organization has an active subscription or valid trial.
 * Enforces platform lockout starting October 1, 2026.
 * @param {Object} user - The user object from database (Mongoose document).
 * @returns {Promise<{ isExpired: boolean, isTopsoroban: boolean, message?: string }>}
 */
const checkAndApplyTopsorobanTrial = async (user) => {
    try {
        if (!user) return { isExpired: false, isTopsoroban: false };

        // Admin accounts are never locked
        if (user.role === 'Admin') {
            return { isExpired: false, isTopsoroban: false };
        }

        // If user is explicitly marked as paid, allow access
        if (user.isPaid) {
            return { isExpired: false, isTopsoroban: false };
        }

        // Check if the user belongs to a school that has paid
        if (user.createdBy) {
            let schoolDoc = null;
            if (typeof user.createdBy === 'object' && user.createdBy.isPaid !== undefined) {
                schoolDoc = user.createdBy;
            } else {
                schoolDoc = await userModel.findById(user.createdBy).select('userName role isPaid createdBy');
            }
            if (schoolDoc && schoolDoc.isPaid) {
                return { isExpired: false, isTopsoroban: false };
            }
            if (schoolDoc && schoolDoc.createdBy) {
                const parentSchool = await userModel.findById(schoolDoc.createdBy).select('isPaid');
                if (parentSchool && parentSchool.isPaid) {
                    return { isExpired: false, isTopsoroban: false };
                }
            }
        }

        const now = new Date();

        // If the user has an active free trial (e.g. 3-day trial from registration)
        if (user.trialEndsAt && now < new Date(user.trialEndsAt)) {
            return { isExpired: false, isTopsoroban: false };
        }

        // Check if we have passed the October 1st midnight lockout deadline
        if (now >= LOCKOUT_CUTOFF) {
            return {
                isExpired: true,
                isTopsoroban: false,
                message: 'Platform subscription required starting October 1st, 2026. Please upgrade your account via WhatsApp (+201505252676) or visit /pricing to continue.'
            };
        }

        // Before cutoff, allow access
        return { isExpired: false, isTopsoroban: false };
    } catch (error) {
        console.error('Error in checkAndApplyTopsorobanTrial:', error);
        return { isExpired: false, isTopsoroban: false };
    }
};

module.exports = { checkAndApplyTopsorobanTrial };
