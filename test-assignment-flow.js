const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

async function testAssignmentFlow() {
    try {
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
        const userId = loginResponse.data.userName;
        console.log('✓ Login successful');
        console.log('  User:', userId);
        console.log('  Role:', loginResponse.data.role);
        console.log('  Token:', token.substring(0, 20) + '...\n');
        
        const authHeader = process.env.AUTH_SECRET_KEY ? `${process.env.AUTH_SECRET_KEY}${token}` : token;
        
        // Step 2: Find Ms.Sara's teacher ID (we'll need to query for this)
        // First, let's get the student's class to find their teacher
        console.log('Step 2: Getting student class info...');
        try {
            const classResponse = await axios.get(`${BASE_URL}/student/getClass`, {
                headers: { 'authrization': authHeader }
            });
            console.log('Class info:', JSON.stringify(classResponse.data, null, 2));
        } catch (err) {
            console.log('Could not get class info:', err.response?.data || err.message);
        }
        
        // Step 3: Get assignments (we'll try to find Ms.Sara by searching for a teacher)
        // Since we need teacherID, let's try a common approach - query for assignments
        console.log('\nStep 3: Attempting to find assignments...');
        console.log('Note: We need to find Ms.Sara\'s teacher ID first.');
        console.log('This will require looking up the teacher or getting assignments differently.\n');
        
        console.log('\n=== Test Flow Completed ===');
        console.log('Next steps:');
        console.log('1. Find Ms.Sara\'s teacher ID from database or API');
        console.log('2. Get assignments using: GET /student/getAssignment/:teacherID');
        console.log('3. Get assignment details: GET /student/assignmentDetails/:assignmentID');
        console.log('4. Submit answers: POST /answer/checkAnswer/:questionID/:assignmentID');
        console.log('5. Get result: GET /answer/getResult/:assignmentID');
        
    } catch (error) {
        console.error('Error during test:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testAssignmentFlow();
