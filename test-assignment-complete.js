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

async function testAssignmentFlow() {
    try {
        await connectDB();
        
        // Load models
        const userModel = require('./DB/models/user.model');
        const assignmentModel = require('./DB/models/assignment.model');
        
        console.log('=== Starting Assignment Flow Test ===\n');
        
        // Step 1: Login as Nadia
        console.log('Step 1: Logging in as Nadia...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'Nadia',
            password: '1234'
        });
        
        if (loginResponse.data.message !== 'success') {
            console.error('Login failed:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.userToken;
        const studentId = loginResponse.data.userName;
        const authSecretKey = process.env.AUTH_SECRET_KEY || '';
        const authHeader = authSecretKey + token;
        
        console.log('✓ Login successful');
        console.log('  User:', studentId);
        console.log('  Role:', loginResponse.data.role, '\n');
        
        // Step 2: Find Ms.Sara's teacher ID from database
        console.log('Step 2: Finding Ms.Sara\'s teacher ID...');
        const msSara = await userModel.findOne({ userName: 'Ms.Sara', role: 'Teacher' });
        
        if (!msSara) {
            console.error('Ms.Sara not found in database');
            await mongoose.connection.close();
            return;
        }
        
        const teacherId = msSara._id.toString();
        console.log('✓ Found Ms.Sara');
        console.log('  Teacher ID:', teacherId, '\n');
        
        // Step 3: Get assignments from Ms.Sara
        console.log('Step 3: Getting assignments from Ms.Sara...');
        const assignmentsResponse = await axios.get(`${BASE_URL}/student/getAssignment/${teacherId}`, {
            headers: { 'authrization': authHeader }
        });
        
        if (assignmentsResponse.data.message !== 'success' || !assignmentsResponse.data.allAssignment || assignmentsResponse.data.allAssignment.length === 0) {
            console.error('No assignments found:', assignmentsResponse.data);
            await mongoose.connection.close();
            return;
        }
        
        const assignments = assignmentsResponse.data.allAssignment;
        const topAssignment = assignments[0]; // Get the first (top) assignment
        const assignmentId = topAssignment._id;
        
        console.log('✓ Found assignments');
        console.log('  Total assignments:', assignments.length);
        console.log('  Top assignment ID:', assignmentId);
        console.log('  Title:', topAssignment.title || 'N/A', '\n');
        
        // Step 4: Get assignment details (questions)
        console.log('Step 4: Getting assignment details...');
        const detailsResponse = await axios.get(`${BASE_URL}/student/assignmentDetails/${assignmentId}`, {
            headers: { 'authrization': authHeader }
        });
        
        if (detailsResponse.data.message !== 'success') {
            console.error('Failed to get assignment details:', detailsResponse.data);
            await mongoose.connection.close();
            return;
        }
        
        const assignmentDetails = detailsResponse.data.assignment;
        const questions = assignmentDetails.questions || [];
        
        console.log('✓ Got assignment details');
        console.log('  Questions count:', questions.length, '\n');
        
        // Step 5: Answer questions (simulate answering the first few questions)
        if (questions.length === 0) {
            console.log('No questions found in assignment');
            await mongoose.connection.close();
            return;
        }
        
        console.log('Step 5: Submitting answers to questions...');
        const answeredQuestions = [];
        
        // Answer first 3 questions with correct answers
        const questionsToAnswer = Math.min(3, questions.length);
        
        for (let i = 0; i < questionsToAnswer; i++) {
            const question = questions[i];
            const questionId = question._id;
            
            // Use correct answers based on what we know from the test output
            // The assignment has Essay questions with answer arrays: Q1=["1","١"], Q2=["4","٤"], Q3=["4","٤"]
            // Use English digits which should match
            const correctAnswers = ['1', '4', '4'];
            const answer = correctAnswers[i] || '1';
            
            try {
                const checkResponse = await axios.post(
                    `${BASE_URL}/answer/checkAnswer/${questionId}/${assignmentId}`,
                    { firstAnswer: answer },
                    { headers: { 'authrization': authHeader } }
                );
                
                answeredQuestions.push({
                    questionId,
                    answer,
                    isCorrect: checkResponse.data.isCorrect,
                    point: checkResponse.data.answer?.point || 0
                });
                
                console.log(`  Question ${i + 1}: ${answer} - ${checkResponse.data.isCorrect ? 'CORRECT' : 'INCORRECT'} (${checkResponse.data.answer?.point || 0} points)`);
            } catch (error) {
                console.error(`  Error answering question ${i + 1}:`, error.response?.data || error.message);
            }
        }
        
        console.log('');
        
        // Step 6: Get final result
        console.log('Step 6: Getting final result...');
        const resultResponse = await axios.get(`${BASE_URL}/answer/getResult/${assignmentId}?time=5:30`, {
            headers: { 'authrization': authHeader }
        });
        
        if (resultResponse.data.message === 'success') {
            const result = resultResponse.data.result;
            console.log('✓ Final Result:');
            console.log('  Total Score:', result.total);
            console.log('  Questions Answered:', result.questionsNumber);
            console.log('  Total Possible Points:', resultResponse.data.totalSummation);
            console.log('  Time Spent:', result.time);
            console.log('  Score Percentage:', result.totalSummation > 0 ? ((result.total / result.totalSummation) * 100).toFixed(1) + '%' : 'N/A');
        } else {
            console.error('Failed to get result:', resultResponse.data);
        }
        
        console.log('\n=== Test Flow Completed ===');
        
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

testAssignmentFlow();
