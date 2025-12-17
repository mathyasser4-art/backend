const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema({
    questions: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "question"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    classes: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "class"
    },
    students: [
        {
            attempts: Number,
            solveBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" }
        }
    ],
    createdAt: String,
    title: String,
    timer: Number,
    startDate: String,
    endDate: String,
    attemptsNumber: Number,
    totalPoints: Number,
})

const assignmentModel = mongoose.model('assignment', assignmentSchema)
module.exports = assignmentModel