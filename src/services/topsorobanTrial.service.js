const userModel = require('../../DB/models/user.model');

/**
 * Checks if a user belongs to Topsoroban School and handles 30-day trial logic.
 * @param {Object} user - The user object from database (Mongoose document).
 * @returns {Promise<{ isExpired: boolean, isTopsoroban: boolean, message?: string }>}
 */
const checkAndApplyTopsorobanTrial = async (user) => {
    try {
        if (!user) return { isExpired: false, isTopsoroban: false };

        // Only enforce on Student and Teacher roles
        if (user.role !== 'Student' && user.role !== 'Teacher') {
            return { isExpired: false, isTopsoroban: false };
        }

        // If user is explicitly marked as paid, allow access
        if (user.isPaid) {
            return { isExpired: false, isTopsoroban: true };
        }

        // Determine if user belongs to Topsoroban
        let isTopsoroban = false;

        // 1. Check createdBy or school
        let createdByDoc = null;
        if (user.createdBy) {
            if (typeof user.createdBy === 'object' && user.createdBy.userName) {
                createdByDoc = user.createdBy;
            } else {
                createdByDoc = await userModel.findById(user.createdBy).select('userName role createdBy');
            }
        }

        if (createdByDoc) {
            if (/topsoroban/i.test(createdByDoc.userName)) {
                isTopsoroban = true;
            } else if (createdByDoc.createdBy) {
                const parentSchool = await userModel.findById(createdByDoc.createdBy).select('userName');
                if (parentSchool && /topsoroban/i.test(parentSchool.userName)) {
                    isTopsoroban = true;
                }
            }
        }

        // 2. If student has a teacher assigned, check teacher's school
        if (!isTopsoroban && user.teacher) {
            let teacherDoc = null;
            if (typeof user.teacher === 'object' && user.teacher.userName) {
                teacherDoc = user.teacher;
            } else {
                teacherDoc = await userModel.findById(user.teacher).select('userName createdBy');
            }

            if (teacherDoc) {
                if (/topsoroban/i.test(teacherDoc.userName)) {
                    isTopsoroban = true;
                } else if (teacherDoc.createdBy) {
                    const teacherSchool = await userModel.findById(teacherDoc.createdBy).select('userName');
                    if (teacherSchool && /topsoroban/i.test(teacherSchool.userName)) {
                        isTopsoroban = true;
                    }
                }
            }
        }

        if (!isTopsoroban) {
            return { isExpired: false, isTopsoroban: false };
        }

        // NOW: User belongs to Topsoroban school
        const now = new Date();

        // If trial has not started yet, start 30-day trial right now!
        if (!user.trialStartedAt) {
            const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
            user.trialStartedAt = now;
            user.trialEndsAt = trialEndsAt;
            await userModel.updateOne(
                { _id: user._id },
                { $set: { trialStartedAt: now, trialEndsAt: trialEndsAt } }
            );
            return { isExpired: false, isTopsoroban: true };
        }

        // Check if trial has expired
        if (user.trialEndsAt && now > new Date(user.trialEndsAt)) {
            // Lock account automatically if expired
            if (!user.disable) {
                user.disable = true;
                await userModel.updateOne(
                    { _id: user._id },
                    { $set: { disable: true } }
                );
            }
            return {
                isExpired: true,
                isTopsoroban: true,
                message: 'Your 30-day free trial for Topsoroban has expired. Please contact support or pay to unlock your account.'
            };
        }

        return { isExpired: false, isTopsoroban: true };
    } catch (error) {
        console.error('Error in checkAndApplyTopsorobanTrial:', error);
        return { isExpired: false, isTopsoroban: false };
    }
};

module.exports = { checkAndApplyTopsorobanTrial };
