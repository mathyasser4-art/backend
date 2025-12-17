const mongoose = require('mongoose')

const schoolSubjectSchema = new mongoose.Schema({
    schoolSubjectName: {
        type: String,
        required: [true, 'subject name is required']
    },
    school:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
})

const schoolSubjectModel = mongoose.model('schoolSubject', schoolSubjectSchema)
module.exports = schoolSubjectModel