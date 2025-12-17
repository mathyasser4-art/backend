const mongoose = require('mongoose');

const connectionDB = () => {
    return mongoose.connect(process.env.ONLINE_CONNECTION_DB).then(() => console.log('connection db is running...')).catch((error) => console.log('an error is happened in connection db', error))
}

module.exports = connectionDB