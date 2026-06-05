const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    return res.status(400).json({ 
        message: 'Public registration is disabled. All user accounts must be created under a specific school by an administrator.' 
    });
}

module.exports = register