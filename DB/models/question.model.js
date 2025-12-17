const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'question is required'],
    },
    questionPic: String,
    questionPicID: String,
    answer: [String], //Essay - Array of acceptable correct answers
    correctAnswer: String, //MCQ - Single correct answer
    wrongAnswer: [String], //MCQ - Array of wrong options
    wrongAnswerID: [String],
    typeOfAnswer: {
        type: String,
        default: "Essay",
        enum: ['Essay', 'MCQ', 'Graph']
    },
    autoCorrect: {
        type: Boolean,
        default: true // Changed to true - all questions are now auto-graded
    },
    correctPicAnswer: String, //Graph - URL or identifier of correct graph image
    wrongPicAnswer: [String], //Graph - Array of wrong graph images
    questionPoints: {
        type: Number,
        required: [true, 'question points is required'],
    },
    chapter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chapter"
    },
    answerPic: String,
    answerPicID: String,
})

const questionModel = mongoose.model('question', questionSchema)
module.exports = questionModel;