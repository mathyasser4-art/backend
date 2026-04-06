const mongoose = require('mongoose')

const classSchema = new mongoose.Schema({
    class: {
        type: String,
        required: [true, 'class is required'],
    },
    school:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    teachers:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user"
    },
})

const classModel = mongoose.model('class', classSchema)
module.exports = classModel