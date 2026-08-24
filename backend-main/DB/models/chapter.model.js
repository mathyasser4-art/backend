const mongoose = require('mongoose')

const chapterSchema = new mongoose.Schema({
    chapterName: {
        type: String,
        required: [true, 'chapter name is required']
    },
    unit:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "unit"
    },
    questions:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "question"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    format: {
        type: String,
        enum: ['MCQ', 'Completion'],
        default: 'MCQ'
    }
})

const chapterModel = mongoose.model('chapter', chapterSchema)
module.exports = chapterModel