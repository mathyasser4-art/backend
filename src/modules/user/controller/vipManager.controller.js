const userModel = require('../../../../DB/models/user.model');
const bcrypt = require('bcryptjs');

const VALID_PINS = ['2026', '7788'];
if (process.env.ADMIN_VIP_PIN) {
    VALID_PINS.push(process.env.ADMIN_VIP_PIN.trim());
}

function verifyPin(pin) {
    if (!pin) return false;
    return VALID_PINS.includes(String(pin).trim());
}

// 1. Search user by username, phone, or email
const vipSearch = async (req, res) => {
    try {
        const { pin, identifier } = req.body;
        if (!verifyPin(pin)) {
            return res.status(403).json({ message: 'Invalid Admin PIN' });
        }
        if (!identifier || !identifier.trim()) {
            return res.status(400).json({ message: 'Identifier is required (username, phone, or email)' });
        }

        const cleanInput = identifier.trim();
        const cleanPhone = cleanInput.replace(/[^\d+]/g, '');

        const orConditions = [
            { userName: cleanInput },
            { userName: { $regex: new RegExp(`^${cleanInput}$`, 'i') } },
            { email: cleanInput.toLowerCase() }
        ];
        if (cleanPhone) {
            orConditions.push({ phone: cleanPhone });
        }

        const user = await userModel.findOne({ $or: orConditions })
            .select('userName phone email role isPaid disable trialStartedAt trialEndsAt coins createdAt createdBy')
            .populate({ path: 'createdBy', select: 'userName role isPaid' });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({ message: 'success', user });
    } catch (error) {
        console.error('VIP search error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 2. Toggle Paid Status (Unlock / Lock)
const vipTogglePaid = async (req, res) => {
    try {
        const { pin, identifier, isPaid } = req.body;
        if (!verifyPin(pin)) {
            return res.status(403).json({ message: 'Invalid Admin PIN' });
        }
        if (!identifier || !identifier.trim()) {
            return res.status(400).json({ message: 'Identifier is required' });
        }

        const cleanInput = identifier.trim();
        const cleanPhone = cleanInput.replace(/[^\d+]/g, '');

        const orConditions = [
            { userName: cleanInput },
            { userName: { $regex: new RegExp(`^${cleanInput}$`, 'i') } },
            { email: cleanInput.toLowerCase() }
        ];
        if (cleanPhone) {
            orConditions.push({ phone: cleanPhone });
        }

        const user = await userModel.findOne({ $or: orConditions });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetPaidStatus = isPaid !== false; // defaults to true unless explicitly false
        user.isPaid = targetPaidStatus;
        if (targetPaidStatus) {
            user.disable = false;
        }
        await user.save();

        let childrenUpdated = 0;
        if (user.role === 'School') {
            const result = await userModel.updateMany(
                { createdBy: user._id },
                { $set: { isPaid: targetPaidStatus, disable: targetPaidStatus ? false : true } }
            );
            childrenUpdated = result.modifiedCount;
        }

        return res.json({
            message: 'success',
            user: {
                _id: user._id,
                userName: user.userName,
                phone: user.phone,
                role: user.role,
                isPaid: user.isPaid,
                disable: user.disable,
                childrenUpdated
            }
        });
    } catch (error) {
        console.error('VIP toggle error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 3. Create New Paid User directly
const vipCreate = async (req, res) => {
    try {
        const { pin, userName, phone, password, role, academy } = req.body;
        if (!verifyPin(pin)) {
            return res.status(403).json({ message: 'Invalid Admin PIN' });
        }
        if (!userName || !phone || !password) {
            return res.status(400).json({ message: 'Username, phone, and password are required' });
        }

        const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
        const cleanUserName = userName.trim();

        // Check if user already exists
        const existing = await userModel.findOne({
            $or: [
                { userName: { $regex: new RegExp(`^${cleanUserName}$`, 'i') } },
                { phone: cleanPhone }
            ]
        });

        if (existing) {
            existing.isPaid = true;
            existing.disable = false;
            if (role) existing.role = role;
            await existing.save();

            return res.json({
                message: 'success',
                note: 'User already existed, upgraded to Paid VIP',
                user: {
                    _id: existing._id,
                    userName: existing.userName,
                    phone: existing.phone,
                    role: existing.role,
                    isPaid: existing.isPaid,
                    alreadyExisted: true
                }
            });
        }

        let schoolId = null;
        let schoolName = null;
        if (academy) {
            const schoolDoc = await userModel.findOne({
                role: 'School',
                userName: { $regex: new RegExp(`^${academy.trim()}$`, 'i') }
            });
            if (schoolDoc) {
                schoolId = schoolDoc._id;
                schoolName = schoolDoc.userName;
            }
        }

        const saltRounds = parseInt(process.env.SALTROUNDS, 10) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const generatedEmail = `${cleanPhone || cleanUserName.toLowerCase()}@abacusheroes.com`;

        const newUser = new userModel({
            userName: cleanUserName,
            email: generatedEmail,
            phone: cleanPhone,
            password: hashedPassword,
            role: role || 'Student',
            createdBy: schoolId,
            verify: true,
            disable: false,
            isPaid: true,
            trialStartedAt: new Date(),
            trialEndsAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000), // 10 years
            coins: 500
        });

        await newUser.save();

        return res.json({
            message: 'success',
            user: {
                _id: newUser._id,
                userName: newUser.userName,
                phone: newUser.phone,
                role: newUser.role,
                isPaid: newUser.isPaid,
                schoolName: schoolName || academy,
                alreadyExisted: false
            }
        });
    } catch (error) {
        console.error('VIP create error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 4. List recent signups for quick 1-click unlock
const vipListRecent = async (req, res) => {
    try {
        const { pin } = req.body;
        if (!verifyPin(pin)) {
            return res.status(403).json({ message: 'Invalid Admin PIN' });
        }

        const users = await userModel.find({})
            .sort({ createdAt: -1 })
            .limit(30)
            .select('userName phone email role isPaid disable createdAt trialEndsAt')
            .populate({ path: 'createdBy', select: 'userName' })
            .lean();

        return res.json({ message: 'success', users });
    } catch (error) {
        console.error('VIP list error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    vipSearch,
    vipTogglePaid,
    vipCreate,
    vipListRecent
};
