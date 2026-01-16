/**
 * Quick MongoDB Connection Test Script
 * Run this locally to verify your connection string works
 * 
 * Usage: node test-connection.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB Connection...\n');

// Check if connection string exists
if (!process.env.ONLINE_CONNECTION_DB) {
    console.error('❌ ERROR: ONLINE_CONNECTION_DB environment variable is not set!');
    console.log('\nCreate a .env file with:');
    console.log('ONLINE_CONNECTION_DB=mongodb+srv://username:password@cluster.mongodb.net/database\n');
    process.exit(1);
}

// Show partial connection string (hide credentials)
const connString = process.env.ONLINE_CONNECTION_DB;
const hiddenString = connString.substring(0, 14) + '****' + connString.substring(connString.lastIndexOf('@'));
console.log(`📝 Connection String: ${hiddenString}\n`);

// Connection options
const options = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority',
};

// Test connection
mongoose.connect(process.env.ONLINE_CONNECTION_DB, options)
    .then(() => {
        console.log('✅ SUCCESS: MongoDB connection established!');
        console.log(`📊 Connected to database: ${mongoose.connection.name}`);
        console.log(`🌍 Host: ${mongoose.connection.host}\n`);
        
        // Try a simple query
        const testCollection = mongoose.connection.db.collection('users');
        return testCollection.countDocuments();
    })
    .then((count) => {
        console.log(`👥 Found ${count} users in database\n`);
        console.log('✨ Connection test PASSED!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ FAILED: MongoDB connection error!\n');
        console.error('Error Type:', error.name);
        console.error('Error Message:', error.message);
        
        console.log('\n🔧 Troubleshooting Tips:');
        
        if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
            console.log('1. ⚠️  Network/Firewall issue detected');
            console.log('   → Check MongoDB Atlas IP Whitelist');
            console.log('   → Add 0.0.0.0/0 to allow all IPs');
        }
        
        if (error.message.includes('Authentication failed')) {
            console.log('2. 🔑 Authentication issue detected');
            console.log('   → Check username and password in connection string');
            console.log('   → Verify database user exists in MongoDB Atlas');
        }
        
        if (error.message.includes('bad auth')) {
            console.log('3. 🔐 Bad credentials detected');
            console.log('   → Password might need URL encoding');
            console.log('   → Special characters should be encoded:');
            console.log('     @ → %40, # → %23, $ → %24, etc.');
        }
        
        if (error.message.includes('getaddrinfo')) {
            console.log('4. 🌐 DNS resolution issue detected');
            console.log('   → Check cluster URL in connection string');
            console.log('   → Verify cluster is active in MongoDB Atlas');
        }
        
        console.log('\n📚 Full troubleshooting guide: See DATABASE_CONNECTION_TROUBLESHOOTING.md\n');
        process.exit(1);
    });