const mongoose = require('mongoose')

const answerSchema = new mongoose.Schema({
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "assignment"
    },
    solveBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    time: {
        type: String,
        default: "0:00"  // Add default value
    },
    questions: [
        {
            question: { type: mongoose.Schema.Types.ObjectId, ref: "question" },
            attempts: Number,
            firstAnswer: String,
            secondAnswer: String,
            thirdAnswer: String,
            fourthAnswer: String,
            isCorrect: Boolean,
            point: Number,
            stepPicture: {
                secure_url: String,
                public_id: String
            },
        }
    ],
    total: Number,
    questionsNumber: Number,
})

const answerModel = mongoose.model('answer', answerSchema)
module.exports = answerModel