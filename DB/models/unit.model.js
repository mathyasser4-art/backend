const mongoose = require('mongoose')

const unitSchema = new mongoose.Schema({
    unitName: {
        type: String,
        required: [true, 'unit name is required']
    },
    questionType:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "questionType"
    },
    subject:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "subject"
    },
    chapters:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "chapter"
    },
})

const unitModel = mongoose.model('unit', unitSchema)
module.exports = unitModel