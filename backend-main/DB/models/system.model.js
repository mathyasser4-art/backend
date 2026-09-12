const mongoose = require('mongoose')

const systemSchema = new mongoose.Schema({
    systemName: {
        type: String,
        required: [true, 'system name is required'],
    },
    subjects:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "subject"
    },
    questionTypeID: {
        type: String,
        default: null
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    visibilityMode: {
        type: String,
        enum: ['all', 'specific', 'none'],
        default: 'all'
    },
    allowedSchools: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }]
})

const systemModel = mongoose.model('system', systemSchema)
module.exports = systemModel