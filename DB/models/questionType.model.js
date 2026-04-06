const mongoose = require('mongoose')

const questionTypeSchema = new mongoose.Schema({
    typeOfquestion: {
        type: String,
        required: [true, 'type of question is required'],
        enum: ['Topic Questions', 'Past Papers']
    },
    typeOfexam:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "exam"
    },
})

const questionTypeModel = mongoose.model('questionType', questionTypeSchema)
module.exports = questionTypeModel