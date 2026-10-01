const mongoose = require('mongoose');

// Connection string
const connectionString = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function setRole() {
  const args = process.argv.slice(2);
  const identifier = args[0]; // username, email, phone, or ID
  const newRole = args[1] || 'Student'; // default to 'Student'

  if (!identifier) {
    console.log('Usage: node set-role.js <username_or_phone> [Student|Teacher|Admin|School]');
    console.log('Example: node set-role.js ahmed Student');
    console.log('Example: node set-role.js 01012345678 Student');
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
      console.log(`❌ User matching "${identifier}" not found in database.`);
      process.exit(1);
    }

    console.log(`Found account: ${user.userName} | Current Role: ${user.role} | ID: ${user._id}`);

    user.role = newRole;
    await user.save();
    console.log(`✓ Successfully updated ${user.userName} to role "${newRole}"!`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating role:', error);
    process.exit(1);
  }
}

setRole();
