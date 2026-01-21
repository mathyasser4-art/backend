const mongoose = require('mongoose');

const connectionDB = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DB/connection.js:4',message:'Database connection function called',data:{hasConnectionString:!!process.env.ONLINE_CONNECTION_DB,connectionStringLength:process.env.ONLINE_CONNECTION_DB ? process.env.ONLINE_CONNECTION_DB.length : 0,mongooseReadyState:mongoose.connection.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const connectionPromise = mongoose.connect(process.env.ONLINE_CONNECTION_DB)
        .then(() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DB/connection.js:8',message:'Database connection successful',data:{readyState:mongoose.connection.readyState,dbName:mongoose.connection.name,host:mongoose.connection.host},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.log('connection db is running...');
        })
        .catch((error) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DB/connection.js:13',message:'Database connection failed',data:{errorName:error?.name,errorMessage:error?.message,errorCode:error?.code,hasConnectionString:!!process.env.ONLINE_CONNECTION_DB},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.log('an error is happened in connection db', error);
        });
    
    return connectionPromise;
}

module.exports = connectionDB