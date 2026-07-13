const mongoose = require('mongoose')

const dailyVisitSchema = new mongoose.Schema({
    date: {
        type: String, // format: "YYYY-MM-DD"
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    role: {
        type: String,
        default: "User"
    },
    userName: {
        type: String,
        required: true
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
})

// Create a compound unique index so a user is only logged once per day
dailyVisitSchema.index({ date: 1, userId: 1 }, { unique: true });

const dailyVisitModel = mongoose.model('dailyVisit', dailyVisitSchema)
module.exports = dailyVisitModel
