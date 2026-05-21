const mongoose = require('mongoose');

// The DB connection string from your DB/connection.js
const connectionString = 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function fixTeacherLink() {
    console.log('Connecting to database...');
    try {
        await mongoose.connect(connectionString);
        console.log('Connected successfully!');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        const teacherUsername = 't.ethar';
        const schoolUsername = 'Abacusheroes';

        // 1. Find the school
        const school = await usersCollection.findOne({ userName: { $regex: new RegExp(`^${schoolUsername}$`, 'i') }, role: 'School' });
        
        if (!school) {
            console.log(`❌ Could not find a School account named "${schoolUsername}".`);
            return;
        }
        console.log(`✅ Found School: ${school.userName} (ID: ${school._id})`);

        // 2. Find the teacher
        const teacher = await usersCollection.findOne({ userName: { $regex: new RegExp(`^${teacherUsername}$`, 'i') } });
        
        if (!teacher) {
            console.log(`❌ Could not find a teacher account named "${teacherUsername}".`);
            return;
        }
        
        console.log(`✅ Found Teacher: ${teacher.userName} (Role: ${teacher.role})`);
        
        if (teacher.createdBy) {
            console.log(`ℹ️ This teacher already has a school ID assigned: ${teacher.createdBy}`);
            if (teacher.createdBy.toString() === school._id.toString()) {
                console.log(`✅ The teacher is ALREADY linked to ${school.userName}!`);
                return;
            } else {
                console.log(`⚠️ The teacher is linked to a DIFFERENT school.`);
            }
        } else {
            console.log(`⚠️ This teacher has NO school assigned (createdBy is empty).`);
        }

        // 3. Link the teacher to the school
        console.log(`\n⏳ Linking teacher "${teacher.userName}" to school "${school.userName}"...`);
        const updateResult = await usersCollection.updateOne(
            { _id: teacher._id },
            { $set: { createdBy: school._id, role: 'Teacher' } }
        );

        if (updateResult.modifiedCount === 1) {
            console.log(`🎉 SUCCESS! The teacher is now linked to the school.`);
            console.log(`👉 You can now log into your Teacher Dashboard, and it will be attached to Abacusheroes school.`);
        } else {
            console.log(`⚠️ No changes were made (they might already be linked properly).`);
        }

    } catch (err) {
        console.error('Error connecting to DB:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB.');
        process.exit(0);
    }
}

fixTeacherLink();
