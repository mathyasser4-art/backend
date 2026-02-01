require('dotenv').config();
const mongoose = require('mongoose');
const systemModel = require('./DB/models/system.model');

async function testSystems() {
    try {
        await mongoose.connect(process.env.ONLINE_CONNECTION_DB);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        const allSystems = await systemModel.find();
        console.log('📊 Total systems in database:', allSystems.length);
        
        if (allSystems.length > 0) {
            console.log('\n📁 Systems data:');
            allSystems.forEach((sys, index) => {
                console.log(`${index + 1}. System ID: ${sys._id}`);
                console.log(`   Name: ${sys.nameOfSystem}`);
                console.log(`   Question Type ID: ${sys.questionTypeID}`);
                console.log(`   Subjects: ${sys.subjects?.length || 0}`);
            });
        } else {
            console.log('⚠️ No systems found in the database!');
            console.log('The systems collection is empty.');
        }
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testSystems();
