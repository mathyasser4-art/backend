const mongoose = require('mongoose')

const subjectSchema = new mongoose.Schema({
    subjectName: {
        type: String,
        required: [true, 'subject name is required']
    }
})

const subjectModel = mongoose.model('subject', subjectSchema)
module.exports = subjectModel