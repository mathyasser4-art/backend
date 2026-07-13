require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://Topsoroban:Topsoroban123@cluster0.o5tmsw1.mongodb.net/Topsoroban?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const School = mongoose.model('School', new mongoose.Schema({ schoolName: String }, { collection: 'users' }));
  const Teacher = mongoose.model('Teacher', new mongoose.Schema({ userName: String, email: String, school: mongoose.Schema.Types.ObjectId, role: String }, { collection: 'users' }));
  
  const school = await School.findOne({ schoolName: /topsoroban/i, role: 'School' });
  if (!school) {
    console.log('School not found.');
    process.exit(0);
  }
  
  const teachers = await Teacher.find({ school: school._id, role: 'Teacher' });
  console.log(`\nTotal Teachers in Topsoroban School: ${teachers.length}`);
  console.log('\nTeacher List:');
  teachers.forEach(t => console.log(`- ${t.userName} (${t.email})`));
  process.exit(0);
}
run().catch(console.error);
