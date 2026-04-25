require('dotenv').config();
const mongoose = require('mongoose');
const questionTypeModel = require('./DB/models/questionType.model');
const systemModel = require('./DB/models/system.model');

async function test() {
    try {
        // Connect to abacusX database instead of abacus
        const connectionString = process.env.ONLINE_CONNECTION_DB.replace('/abacus?', '/abacusX?');
        console.log('🔗 Connecting to abacusX database...\n');
        
        await mongoose.connect(connectionString);
        console.log('✅ Connected to database:', mongoose.connection.name);
        
        const questionTypes = await questionTypeModel.find();
        console.log('\n📊 Question Types in abacusX:', questionTypes.length);
        questionTypes.forEach((qt, i) => {
            console.log(`${i + 1}. ID: ${qt._id}, Name: ${qt.nameOfQuestionType}`);
        });
        
        const systems = await systemModel.find();
        console.log('\n📊 Systems in abacusX:', systems.length);
        systems.forEach((sys, i) => {
            console.log(`${i + 1}. ID: ${sys._id}, QuestionTypeID: ${sys.questionTypeID}, Subjects: ${sys.subjects?.length}`);
        });
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

test();
