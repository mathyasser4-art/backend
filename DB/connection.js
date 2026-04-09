const mongoose = require('mongoose');

const connectionDB = () => {
    const connectionString = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';

    return mongoose.connect(connectionString)
        .then(() => {
            console.log('connection db is running...');
        })
        .catch((error) => {
            console.log('an error is happened in connection db', error);
        });
}

module.exports = connectionDB
