const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    unreadByAdmin: {
        type: Boolean,
        default: false
    },
    unreadByUser: {
        type: Boolean,
        default: false
    },
    messages: [{
        senderRole: {
            type: String,
            enum: ['user', 'admin'],
            required: true
        },
        text: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
