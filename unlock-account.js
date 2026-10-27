const mongoose = require('mongoose');

// Database Connection String
const connectionString = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function unlockAccount() {
  const args = process.argv.slice(2);
  const identifier = args[0]; // username, phone, or email
  const durationArg = args[1]; // optional: 'lifetime' (default), or number of days like '365'

  if (!identifier) {
    console.log('\n======================================================');
    console.log('  Abacus Heroes — Permanent / Lifetime Account Unlocker');
    console.log('======================================================');
    console.log('Usage:');
    console.log('  node unlock-account.js <username_or_phone_or_email> [days|lifetime]');
    console.log('\nExamples:');
    console.log('  node unlock-account.js Omar2026           (Unlocks permanently until year 2099)');
    console.log('  node unlock-account.js 01012345678        (Unlocks permanently by phone)');
    console.log('  node unlock-account.js teacher@gmail.com  (Unlocks permanently by email)');
    console.log('  node unlock-account.js MonaTeacher 365    (Unlocks for 365 days)');
    console.log('  node unlock-account.js MonaTeacher lock   (Locks account back again)');
    console.log('======================================================\n');
    process.exit(1);
  }

  const cleanInput = identifier.trim();
  const cleanPhone = cleanInput.replace(/[^\d+]/g, '');

  console.log(`Connecting to MongoDB...`);
  try {
    await mongoose.connect(connectionString);
    console.log('Connected successfully!');

    const userModel = require('./DB/models/user.model');

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
      console.log(`\n❌ User not found with identifier: "${cleanInput}"`);
      process.exit(1);
    }

    if (durationArg && durationArg.toLowerCase() === 'lock') {
      user.featuresUnlockedUntil = null;
      user.sharePassExpiresAt = null;
      await user.save();
      console.log(`\n🔒 Account "${user.userName}" has been LOCKED again from games & competitions.`);
      process.exit(0);
    }

    let expiryDate;
    if (durationArg && !isNaN(parseInt(durationArg, 10))) {
      const days = parseInt(durationArg, 10);
      expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      console.log(`Setting unlock for ${days} days...`);
    } else {
      // Default: Lifetime (Year 2099)
      expiryDate = new Date('2099-12-31T23:59:59.000Z');
      console.log(`Setting PERMANENT / LIFETIME unlock (until year 2099)...`);
    }

    user.featuresUnlockedUntil = expiryDate;
    user.isPaid = true;
    user.disable = false;
    await user.save();

    console.log('\n======================================================');
    console.log('🎉 ACCOUNT SUCCESSFULLY UNLOCKED FOR ALL TIME!');
    console.log('======================================================');
    console.log(` Username       : ${user.userName}`);
    console.log(` Phone          : ${user.phone || 'N/A'}`);
    console.log(` Email          : ${user.email}`);
    console.log(` Role           : ${user.role}`);
    console.log(` Status         : UNLOCKED FOR ALL TIME 🌟`);
    console.log(` Unlocked Until : ${expiryDate.toISOString()}`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error unlocking account:', err.message);
    process.exit(1);
  }
}

unlockAccount();
