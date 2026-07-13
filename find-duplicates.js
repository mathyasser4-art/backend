const mongoose = require('mongoose');

const dbUri = 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

async function checkDuplicates() {
    try {
        await mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to DB');

        // Check user collection
        const db = mongoose.connection.db;
        
        const collections = ['users', 'students', 'teachers', 'schools'];
        
        for (const col of collections) {
            console.log(`Checking duplicates in ${col}...`);
            const items = await db.collection(col).aggregate([
                {
                    $group: {
                        _id: "$name", // Adjust if the field is 'username' or 'firstName'
                        count: { $sum: 1 },
                        docs: { $push: "$_id" }
                    }
                },
                {
                    $match: {
                        count: { $gt: 1 },
                        _id: { $ne: null }
                    }
                }
            ]).toArray();

            if (items.length > 0) {
                console.log(`Found ${items.length} duplicate names in ${col}:`);
                items.forEach(item => {
                    console.log(`- Name: "${item._id}", Count: ${item.count}`);
                });
            } else {
                console.log(`No duplicates found in ${col} by name.`);
            }
            
            // Also check by username if name field doesn't exist
            const itemsUsername = await db.collection(col).aggregate([
                {
                    $group: {
                        _id: "$username", 
                        count: { $sum: 1 },
                        docs: { $push: "$_id" }
                    }
                },
                {
                    $match: {
                        count: { $gt: 1 },
                        _id: { $ne: null }
                    }
                }
            ]).toArray();

            if (itemsUsername.length > 0) {
                console.log(`Found ${itemsUsername.length} duplicate usernames in ${col}:`);
                itemsUsername.forEach(item => {
                    console.log(`- Username: "${item._id}", Count: ${item.count}`);
                });
            } else {
                console.log(`No duplicates found in ${col} by username.`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkDuplicates();
