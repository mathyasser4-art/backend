// MongoDB Connection Test Script
// Run this to verify your MongoDB Atlas connection is working

const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
    console.log('🔍 Testing MongoDB Connection...\n');
    
    const connectionString = process.env.ONLINE_CONNECTION_DB;
    
    if (!connectionString) {
        console.error('❌ ERROR: ONLINE_CONNECTION_DB not found in .env file');
        console.log('💡 Make sure you have a .env file with ONLINE_CONNECTION_DB variable');
        process.exit(1);
    }
    
    console.log('📋 Connection String (partial):', connectionString.substring(0, 30) + '...');
    
    try {
        const options = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };
        
        console.log('⏳ Attempting to connect...');
        
        await mongoose.connect(connectionString, options);
        
        console.log('✅ SUCCESS! MongoDB connection established');
        console.log('📊 Database:', mongoose.connection.name);
        console.log('🔗 Host:', mongoose.connection.host);
        
        // Test a simple query
        console.log('\n⏳ Testing database query...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('✅ Query successful! Collections found:', collections.length);
        
        if (collections.length > 0) {
            console.log('📁 Collections:');
            collections.forEach(col => console.log('   -', col.name));
        }
        
        // Test users collection specifically
        const User = mongoose.model('User', new mongoose.Schema({
            userName: String,
            email: String,
            verify: Boolean
        }), 'users');
        
        console.log('\n⏳ Testing users collection...');
        const userCount = await User.countDocuments();
        console.log('✅ Users collection accessible! Total users:', userCount);
        
        if (userCount > 0) {
            console.log('\n⏳ Searching for "Ms.Sara"...');
            const sara = await User.findOne({ 
                $or: [
                    { userName: 'Ms.Sara' },
                    { email: 'Ms.Sara' }
                ]
            });
            
            if (sara) {
                console.log('✅ Found user "Ms.Sara"!');
                console.log('   Username:', sara.userName);
                console.log('   Email:', sara.email);
                console.log('   Verified:', sara.verify);
                console.log('   Role:', sara.role);
            } else {
                console.log('⚠️  User "Ms.Sara" not found in database');
                console.log('💡 You may need to register this user first');
            }
        }
        
        console.log('\n✅ All tests passed! MongoDB is working correctly.');
        
    } catch (error) {
        console.error('\n❌ CONNECTION FAILED!');
        console.error('Error:', error.message);
        
        if (error.message.includes('timeout')) {
            console.log('\n💡 TIMEOUT ERROR - Most likely causes:');
            console.log('   1. MongoDB Atlas IP whitelist doesn\'t include 0.0.0.0/0');
            console.log('   2. Check Network Access in MongoDB Atlas');
            console.log('   3. Wait 2-3 minutes after adding IP to whitelist');
        } else if (error.message.includes('authentication failed')) {
            console.log('\n💡 AUTHENTICATION ERROR - Check:');
            console.log('   1. Username and password in connection string');
            console.log('   2. Database Access user exists in MongoDB Atlas');
            console.log('   3. Password special characters are URL-encoded');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 DNS ERROR - Check:');
            console.log('   1. Cluster URL in connection string is correct');
            console.log('   2. Cluster is not paused in MongoDB Atlas');
        }
        
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed');
    }
}

// Run the test
testConnection();