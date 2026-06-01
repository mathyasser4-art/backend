const mongoose = require('mongoose');

const questionReportSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "question",
        required: [true, 'Question reference is required']
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, 'Reporting teacher reference is required']
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, 'School reference is required']
    },
    issueType: {
        type: String,
        enum: ['answer', 'skill', 'other'],
        default: 'answer'
    },
    teacherComment: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const questionReportModel = mongoose.model('questionReport', questionReportSchema);
module.exports = questionReportModel;
