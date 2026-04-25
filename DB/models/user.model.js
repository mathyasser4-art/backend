const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, 'Username is required'],
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [45, ' User name must not exceed 45 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
    },
    password: String,
    verify:{
        type: Boolean,
        default: false 
    },
    disable:{
        type: Boolean,
        default: false 
    },
    role: {
        type: String,
        default: "User",
        enum: ['User', 'Admin', 'School', 'Teacher', 'Student', 'IT', 'Supervisor'] 
    },
    checkresetPasswordCode:{
        type: Boolean,
        default: false 
    },
    class:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "class"
    }, 
    classList:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "class"
    }, 
    teacherList:{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user"
    }, 
    subject:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "schoolSubject"
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    verificationCode: String,
    resetPasswordCode: String,
})

const userModel = mongoose.model('user', userSchema)
module.exports = userModel