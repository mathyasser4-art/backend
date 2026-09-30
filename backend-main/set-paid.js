const mongoose = require('mongoose');

// Connection string
const connectionString = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function setPaid() {
  const args = process.argv.slice(2);
  const identifier = args[0]; // username, email, phone, or ID
  const isPaidVal = args[1] !== 'false'; // defaults to true unless explicitly 'false'

  if (!identifier) {
    console.log('Usage: node set-paid.js <username_or_phone_or_school> [true|false]');
    console.log('Example: node set-paid.js MasterMinds true');
    console.log('Example: node set-paid.js 01012345678 true');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB...`);
  try {
    await mongoose.connect(connectionString);
    console.log('Connected!');

    const userModel = require('./DB/models/user.model');

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
    if (mongoose.Types.ObjectId.isValid(cleanInput)) {
      orConditions.push({ _id: cleanInput });
    }

    const user = await userModel.findOne({ $or: orConditions });

    if (!user) {
      console.log(`❌ User/School matching "${identifier}" not found in database.`);
      process.exit(1);
    }

    console.log(`Found account: ${user.userName} | Role: ${user.role} | ID: ${user._id}`);

    // Update the account
    user.isPaid = isPaidVal;
    if (isPaidVal) {
      user.disable = false; // unblock if disabled
    }
    await user.save();
    console.log(`✓ Set ${user.userName} (${user.role}) isPaid = ${isPaidVal}`);

    // If it's a School, also update all associated students and teachers if desired
    if (user.role === 'School') {
      const childrenResult = await userModel.updateMany(
        { createdBy: user._id },
        { $set: { isPaid: isPaidVal, disable: isPaidVal ? false : true } }
      );
      console.log(`✓ Updated ${childrenResult.modifiedCount} teachers & students under school ${user.userName} to isPaid = ${isPaidVal}`);
    }

    console.log(`🎉 Successfully updated subscription status!`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setPaid();
