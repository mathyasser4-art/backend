const mongoose = require('mongoose');

const competitionEventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    eventDate: {
        type: Date
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    registrations: [{
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        registeredAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('competitionEvent', competitionEventSchema);
