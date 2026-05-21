const mongoose = require('mongoose');

// The DB connection string from your DB/connection.js
const connectionString = 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function fixUser() {
    console.log('Connecting to database...');
    try {
        await mongoose.connect(connectionString);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Look for the user
        const usernameToFix = 't.ethgar 1234'; // OR 't.ethgar' depending on exactly what was typed
        const user = await usersCollection.findOne({ userName: { $regex: new RegExp(usernameToFix, 'i') } });

        if (!user) {
            console.log(`Could not find a user matching "${usernameToFix}".`);
            console.log('You might have a different exact username.');
        } else {
            console.log('Found user:', user.userName);
            
            // Delete the unlinked user so you can recreate it from the School Dashboard
            const result = await usersCollection.deleteOne({ _id: user._id });
            if (result.deletedCount === 1) {
                console.log(`✅ Successfully deleted orphaned user "${user.userName}".`);
                console.log('👉 Now, log in as the School Admin, go to the School Dashboard -> Teachers -> Add New Teacher.');
                console.log('👉 Create the teacher from there so they get linked to your school!');
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB.');
    }
}

fixUser();
