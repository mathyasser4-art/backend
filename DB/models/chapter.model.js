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
})

const chapterModel = mongoose.model('chapter', chapterSchema)
module.exports = chapterModel