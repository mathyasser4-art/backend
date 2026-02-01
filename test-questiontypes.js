require('dotenv').config();
const mongoose = require('mongoose');
const questionTypeModel = require('./DB/models/questionType.model');
const systemModel = require('./DB/models/system.model');

async function test() {
    try {
        await mongoose.connect(process.env.ONLINE_CONNECTION_DB);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        const questionTypes = await questionTypeModel.find();
        console.log('\n📊 Question Types:', questionTypes.length);
        questionTypes.forEach((qt, i) => {
            console.log(`${i + 1}. ID: ${qt._id}, Name: ${qt.nameOfQuestionType}`);
        });
        
        const systems = await systemModel.find();
        console.log('\n📊 Systems:', systems.length);
        systems.forEach((sys, i) => {
            console.log(`${i + 1}. ID: ${sys._id}, QuestionTypeID: ${sys.questionTypeID}, Subjects: ${sys.subjects?.length}`);
        });
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();
