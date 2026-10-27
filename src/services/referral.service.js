const crypto = require('crypto');
const userModel = require('../../DB/models/user.model');

/**
 * Generate a unique referral code.
 * Example format: AH-K7W9X
 */
async function generateUniqueReferralCode() {
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        attempts++;
        const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
        code = `AH-${randomStr}`;
        const existing = await userModel.findOne({ referralCode: code });
        if (!existing) {
            isUnique = true;
        }
    }
    return code;
}

/**
 * Check if competitions and games are unlocked for a user.
 */
function isFeaturesUnlocked(user) {
    if (!user) return false;
    if (user.role === 'Admin') return true;

    const now = new Date();
    
    // Check 30-day (or extended) referral unlock
    if (user.featuresUnlockedUntil && new Date(user.featuresUnlockedUntil) > now) {
        return true;
    }

    // Check 48-hour instant share pass
    if (user.sharePassExpiresAt && new Date(user.sharePassExpiresAt) > now) {
        return true;
    }

    return false;
}

/**
 * Get structured unlock and referral details for a user.
 */
function getUnlockDetails(user) {
    if (!user) {
        return {
            isUnlocked: false,
            unlockedUntil: null,
            sharePassExpiresAt: null,
            daysRemaining: 0,
            referralCode: null,
            referralCount: 0
        };
    }

    const now = new Date();
    const isUnlocked = isFeaturesUnlocked(user);

    let effectiveEndDate = null;
    if (user.featuresUnlockedUntil && new Date(user.featuresUnlockedUntil) > now) {
        effectiveEndDate = new Date(user.featuresUnlockedUntil);
    } else if (user.sharePassExpiresAt && new Date(user.sharePassExpiresAt) > now) {
        effectiveEndDate = new Date(user.sharePassExpiresAt);
    }

    let daysRemaining = 0;
    if (effectiveEndDate) {
        const diffMs = effectiveEndDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
        isUnlocked,
        unlockedUntil: user.featuresUnlockedUntil,
        sharePassExpiresAt: user.sharePassExpiresAt,
        daysRemaining,
        referralCode: user.referralCode,
        referralCount: user.referralCount || 0
    };
}

/**
 * Process referral reward when a new user registers with a referral code.
 * - Referrer gets +30 Days Unlocked and referralCount + 1.
 * - Newly registered teacher gets a 3-Day Welcome Trial.
 */
async function applyReferralReward(newUser, referralCodeRaw) {
    if (!referralCodeRaw || typeof referralCodeRaw !== 'string') return null;

    const cleanCode = referralCodeRaw.trim().toUpperCase();
    if (!cleanCode) return null;

    // Find the teacher who shared this code
    const referrer = await userModel.findOne({ referralCode: cleanCode });
    if (!referrer) return null;

    // Prevent self-referral
    if (referrer._id.toString() === newUser._id?.toString()) return null;

    // 1. Reward the Referrer: Stack +30 Days
    const now = new Date();
    const baseDate = (referrer.featuresUnlockedUntil && new Date(referrer.featuresUnlockedUntil) > now)
        ? new Date(referrer.featuresUnlockedUntil)
        : now;

    const newUnlockedUntil = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    referrer.featuresUnlockedUntil = newUnlockedUntil;
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    await referrer.save();

    // 2. Reward the New Teacher: 3-Day Welcome Trial Pass
    const welcomeTrialUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    newUser.referredBy = referrer._id;
    newUser.featuresUnlockedUntil = welcomeTrialUntil;

    return {
        referrerId: referrer._id,
        referrerName: referrer.userName,
        newUnlockedUntil
    };
}

module.exports = {
    generateUniqueReferralCode,
    isFeaturesUnlocked,
    getUnlockDetails,
    applyReferralReward
};
