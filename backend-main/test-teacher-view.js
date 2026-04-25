const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = 'http://localhost:8000';

// Connect to database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.ONLINE_CONNECTION_DB);
        console.log('✓ Database connected\n');
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

async function testTeacherView() {
    try {
        await connectDB();
        
        // Load models
        const userModel = require('./DB/models/user.model');
        const assignmentModel = require('./DB/models/assignment.model');
        const answerModel = require('./DB/models/answer.model');
        
        console.log('=== Testing Teacher View of Student Answers ===\n');
        
        // Step 1: Login as Nadia (student)
        console.log('Step 1: Logging in as Nadia (student)...');
        const studentLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'Nadia',
            password: '1234'
        });
        
        if (studentLoginResponse.data.message !== 'success') {
            console.error('Student login failed:', studentLoginResponse.data);
            return;
        }
        
        const studentToken = studentLoginResponse.data.userToken;
        const studentUserName = studentLoginResponse.data.userName;
        const authSecretKey = process.env.AUTH_SECRET_KEY || '';
        const studentAuthHeader = authSecretKey + studentToken;
        
        console.log('✓ Student login successful');
        console.log('  User:', studentUserName, '\n');
        
        // Get student ID from database
        const student = await userModel.findOne({ userName: studentUserName });
        const studentId = student._id.toString();
        console.log('Student ID from DB:', studentId, '\n');
        
        // Step 2: Login as Ms.Sara (teacher)
        console.log('Step 2: Logging in as Ms.Sara (teacher)...');
        const teacherLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'Ms.Sara',
            password: '1234'
        });
        
        if (teacherLoginResponse.data.message !== 'success') {
            console.error('Teacher login failed:', teacherLoginResponse.data);
            await mongoose.connection.close();
            return;
        }
        
        const teacherToken = teacherLoginResponse.data.userToken;
        const teacherAuthHeader = authSecretKey + teacherToken;
        
        console.log('✓ Teacher login successful');
        console.log('  User:', teacherLoginResponse.data.userName, '\n');
        
        // Step 3: Get top assignment from Ms.Sara
        console.log('Step 3: Getting top assignment...');
        const msSara = await userModel.findOne({ userName: 'Ms.Sara', role: 'Teacher' });
        const teacherId = msSara._id.toString();
        
        const assignmentsResponse = await axios.get(`${BASE_URL}/student/getAssignment/${teacherId}`, {
            headers: { 'authrization': studentAuthHeader }
        });
        
        if (assignmentsResponse.data.message !== 'success' || !assignmentsResponse.data.allAssignment || assignmentsResponse.data.allAssignment.length === 0) {
            console.error('No assignments found:', assignmentsResponse.data);
            await mongoose.connection.close();
            return;
        }
        
        const topAssignment = assignmentsResponse.data.allAssignment[0];
        const assignmentId = topAssignment._id;
        
        console.log('✓ Found assignment');
        console.log('  Assignment ID:', assignmentId, '\n');
        
        // Step 4: Check what answers exist in database for this student/assignment
        console.log('Step 4: Checking answers in database...');
        const answersInDb = await answerModel.findOne({ 
            solveBy: student._id, 
            assignment: assignmentId 
        });
        
        console.log('Answers in database:');
        console.log('  Found:', !!answersInDb);
        if (answersInDb) {
            console.log('  Answer document ID:', answersInDb._id);
            console.log('  Questions answered:', answersInDb.questions.length);
            console.log('  Total score:', answersInDb.total);
            console.log('  solveBy (in DB):', answersInDb.solveBy.toString());
            console.log('  assignment (in DB):', answersInDb.assignment.toString());
            if (answersInDb.questions.length > 0) {
                console.log('  First question answer:', answersInDb.questions[0].firstAnswer);
            }
        }
        console.log('');
        
        // Step 5: Try teacher view with string IDs (as would come from route params)
        console.log('Step 5: Teacher view with string IDs...');
        try {
            const teacherViewResponse = await axios.get(`${BASE_URL}/answer/getAnswer/${studentId}/${assignmentId}`, {
                headers: { 'authrization': teacherAuthHeader }
            });
            
            console.log('✓ Teacher view successful');
            console.log('  Response message:', teacherViewResponse.data.message);
            if (teacherViewResponse.data.report) {
                console.log('  Report questions count:', teacherViewResponse.data.report.questions?.length || 0);
                console.log('  Total score:', teacherViewResponse.data.answers?.total || 0);
            }
        } catch (error) {
            console.error('✗ Teacher view failed');
            console.error('  Status:', error.response?.status);
            console.error('  Message:', error.response?.data?.message || error.message);
        }
        
        console.log('\n=== Test Completed ===');
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('Error during test:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
    }
}

testTeacherView();
