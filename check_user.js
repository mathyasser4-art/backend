const mongoose = require('mongoose');
const connectionDB = require('./DB/connection');
const userModel = require('./DB/models/user.model');

async function checkUser() {
    await connectionDB();
    const users = await userModel.find({ userName: { $regex: /t\.ethgar/i } }).populate('school');
    console.log("Found users:", JSON.stringify(users, null, 2));
    process.exit(0);
}

checkUser();
