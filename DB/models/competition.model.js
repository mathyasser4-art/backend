const mongoose = require('mongoose')

const competitionSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Competition title is required'] 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, 'CreatedBy user ID is required']
    },
    questions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "question"
    },
    status: {
        type: String,
        enum: ['lobby', 'active', 'finished'],
        default: 'lobby'
    },
    timer: {
        type: Number,
        default: 300 // default 5 minutes (300 seconds)
    },
    startedAt: {
        type: Date
    },
    participants: [
        {
            student: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: "user" 
            },
            score: { 
                type: Number, 
                default: 0 
            },
            finishedAt: {
                type: Date
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const competitionModel = mongoose.model('competition', competitionSchema)
module.exports = competitionModel
