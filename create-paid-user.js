const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Database Connection String
const connectionString = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function createPaidUser() {
  const args = process.argv.slice(2);
  const userName = args[0];
  const phone = args[1];
  const password = args[2];
  const role = args[3] || 'Student'; // 'Student', 'Teacher', or 'School'
  const academy = args[4] || null;    // e.g. 'MasterMinds', 'Topsoroban'

  if (!userName || !phone || !password) {
    console.log('\n======================================================');
    console.log('  Abacus Heroes — Instant Paid Account Creator');
    console.log('======================================================');
    console.log('Usage:');
    console.log('  node create-paid-user.js <username> <phone> <password> [role] [academy]');
    console.log('\nExamples:');
    console.log('  node create-paid-user.js Omar2026 01012345678 pass123 Student MasterMinds');
    console.log('  node create-paid-user.js MonaTeacher 01198765432 secret123 Teacher Topsoroban');
    console.log('  node create-paid-user.js SmartAcademy 01200000000 school123 School');
    console.log('======================================================\n');
    process.exit(1);
  }

  const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
  const cleanUserName = userName.trim();

  console.log(`Connecting to MongoDB...`);
  try {
    await mongoose.connect(connectionString);
    console.log('Connected successfully!');

    const userModel = require('./DB/models/user.model');

    // 1. Check if user already exists
    const existing = await userModel.findOne({
      $or: [
        { userName: { $regex: new RegExp(`^${cleanUserName}$`, 'i') } },
        { phone: cleanPhone }
      ]
    });

    if (existing) {
      console.log(`\n⚠️  An account already exists with that username or phone:`);
      console.log(`   Username: ${existing.userName} | Role: ${existing.role} | ID: ${existing._id}`);
      console.log(`   Upgrading this account to PAID status now...`);

      existing.isPaid = true;
      existing.disable = false;
      if (role && role !== existing.role) {
        existing.role = role;
      }
      await existing.save();

      console.log(`\n🎉 Account "${existing.userName}" has been upgraded to PAID!`);
      printAccountSummary(existing.userName, cleanPhone, '[Existing Password]', existing.role, academy);
      process.exit(0);
    }

    // 2. Resolve Academy / School if specified
    let schoolId = null;
    let schoolDoc = null;
    if (academy) {
      schoolDoc = await userModel.findOne({
        role: 'School',
        userName: { $regex: new RegExp(`^${academy.trim()}$`, 'i') }
      });
      if (schoolDoc) {
        schoolId = schoolDoc._id;
        console.log(`✓ Linked account under School: ${schoolDoc.userName} (${schoolDoc._id})`);
      } else {
        console.log(`ℹ️ Academy "${academy}" not found as School role, proceeding without school link.`);
      }
    }

    // 3. Hash Password
    const saltRounds = parseInt(process.env.SALTROUNDS, 10) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const generatedEmail = `${cleanPhone || cleanUserName.toLowerCase()}@abacusheroes.com`;

    // 4. Create User
    const newUser = new userModel({
      userName: cleanUserName,
      email: generatedEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: role,
      createdBy: schoolId,
      verify: true,
      disable: false,
      isPaid: true,
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000), // 10 years
      coins: 500 // VIP Bonus coins
    });

    await newUser.save();

    console.log(`\n🎉 New PAID account created successfully!`);
    printAccountSummary(cleanUserName, cleanPhone, password, role, schoolDoc ? schoolDoc.userName : academy);

  } catch (error) {
    console.error('Error creating paid account:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

function printAccountSummary(userName, phone, password, role, academy) {
  console.log('\n======================================================');
  console.log('        ABACUS HEROES — PAID ACCOUNT CREDENTIALS       ');
  console.log('======================================================');
  console.log(` Username : ${userName}`);
  console.log(` Phone    : ${phone}`);
  console.log(` Password : ${password}`);
  console.log(` Role     : ${role}`);
  console.log(` Status   : UNLOCKED (Paid VIP)`);
  if (academy) console.log(` Academy  : ${academy}`);
  console.log('------------------------------------------------------');
  console.log(' Ready-to-send Message:');
  console.log(` "Welcome to Abacus Heroes! 🚀 Your paid VIP account is ready:\n Website: https://abacusheroes.com\n Username: ${userName} (or Phone: ${phone})\n Password: ${password}\n Enjoy full access to all levels, games & journey!"`);
  console.log('======================================================\n');
}

createPaidUser();
