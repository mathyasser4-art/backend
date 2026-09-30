const userModel = require('../../../../DB/models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { userName, phone, email, password, cPassword, academy, role } = req.body;
        
        if (!userName || !password || !cPassword) {
            return res.status(400).json({ message: 'Username, password and confirm password are required' });
        }

        if (userName.trim().length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters long' });
        }

        if (password.length < 4) {
            return res.status(400).json({ message: 'Password must be at least 4 characters long' });
        }

        if (password !== cPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Clean phone number (strip whitespace, dashes, symbols)
        const cleanPhone = phone ? phone.toString().replace(/[^\d+]/g, '').trim() : null;
        
        // If neither phone nor email is supplied
        if (!cleanPhone && !email) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Generate email if only phone is provided
        const finalEmail = (email && email.trim()) 
            ? email.trim().toLowerCase() 
            : `${cleanPhone || userName.replace(/[^\w]/g, '').toLowerCase()}@abacusheroes.com`;

        // Check if user with same username, phone, or email already exists
        const orConditions = [
            { userName: userName.trim() },
            { email: finalEmail }
        ];
        if (cleanPhone) {
            orConditions.push({ phone: cleanPhone });
        }

        const existingUser = await userModel.findOne({ $or: orConditions });
        if (existingUser) {
            if (existingUser.userName.toLowerCase() === userName.trim().toLowerCase()) {
                return res.status(400).json({ message: 'Username is already taken. Please choose another username.' });
            }
            if (cleanPhone && existingUser.phone === cleanPhone) {
                return res.status(400).json({ message: 'This phone number is already registered. Please login.' });
            }
            return res.status(400).json({ message: 'An account with this email/phone already exists. Please login.' });
        }

        const saltRounds = parseInt(process.env.SALTROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3 Days Free Trial starts right now!
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 full days

        let schoolId = null;
        if (academy && academy !== 'Other') {
            const school = await userModel.findOne({ role: 'School', userName: academy });
            if (school) schoolId = school._id;
        }

        const userRole = role || 'Student';

        const newUser = new userModel({
            userName: userName.trim(),
            email: finalEmail,
            phone: cleanPhone,
            password: hashedPassword,
            role: userRole,
            createdBy: schoolId,
            verify: true,
            disable: false,
            trialStartedAt: now,
            trialEndsAt: trialEndsAt,
            isPaid: false,
            coins: 100 // Welcome coins bonus
        });

        await newUser.save();

        const userToken = jwt.sign({ id: newUser._id }, process.env.TOKEN_SECRET_KEY);

        return res.json({
            message: 'success',
            userToken,
            role: newUser.role,
            userName: newUser.userName,
            userID: newUser._id,
            phone: newUser.phone,
            trialStartedAt: newUser.trialStartedAt,
            trialEndsAt: newUser.trialEndsAt,
            isPaid: newUser.isPaid,
            remainingDays: 3
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = register;