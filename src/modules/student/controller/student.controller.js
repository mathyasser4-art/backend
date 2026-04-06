const userModel = require('../../../../DB/models/user.model')
const assignmentModel = require('../../../../DB/models/assignment.model')
const answerModel = require('../../../../DB/models/answer.model')
const checkExpiration = require('../../../services/checkExpiration')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const bcrypt = require('bcryptjs');

const getStudent = async (req, res) => {
    try {
        const { pageNumber } = req.params
        const skippedNumber = (pageNumber - 1) * 20
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allStudent = await userModel.find({ role: "Student", createdBy: schoolID }).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
        const countStudent = await userModel.countDocuments({ role: "Student", createdBy: schoolID });
        if (allStudent.length != 0) {
            res.json({ message: "success", allStudent, numberOfStudent: countStudent, totalPage: Math.ceil(countStudent / 20) })
        } else {
            res.json({ message: "There is no any student yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addStudent = async (req, res) => {
    try {
        const { userName, password } = req.body
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const findStudent = await userModel.findOne({ userName, role: "Student", createdBy: schoolID })
        if (findStudent) {
            res.json({ message: "This student name is already registered" })
        } else {
            const { pageNumber } = req.params
            const skippedNumber = (pageNumber - 1) * 20
            try {
                const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
            req.body.verify = true
            req.body.role = 'Student'
            req.body.createdBy = schoolID
            const addStudent = new userModel(req.body)
            await addStudent.save()
            const allStudent = await userModel.find({ role: "Student", createdBy: schoolID }).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
            const countStudent = await userModel.countDocuments({ role: "Student", createdBy: schoolID });
            res.json({ message: "success", allStudent, numberOfStudent: countStudent, totalPage: Math.ceil(countStudent / 20) })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateStudent = async (req, res) => {
    try {
        const { studentID, pageNumber } = req.params
        if (req.body.password != undefined) {
            try {
                const hashPassword = await bcrypt.hash(req.body.password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
        }
        const updateStudent = await userModel.findByIdAndUpdate(studentID, req.body)
        if (updateStudent) {
            const skippedNumber = (pageNumber - 1) * 20
            const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
            const countStudent = await userModel.countDocuments({ role: "Student", createdBy: schoolID });
            const allStudent = await userModel.find({ role: "Student", createdBy: schoolID }).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
            res.json({ message: "success", allStudent, numberOfStudent: countStudent, totalPage: Math.ceil(countStudent / 20) })
        } else {
            res.json({ message: "This student is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteStudent = async (req, res) => {
    try {
        const { studentID, pageNumber } = req.params
        const findStudent = await userModel.findById(studentID)
        if (findStudent) {
            const deleteStudent = await userModel.findByIdAndDelete(studentID)
            if (deleteStudent) {
                const findAnswer = await answerModel.find({ solveBy: deleteStudent._id })
                for (let index = 0; index < findAnswer.length; index++) {
                    const element = findAnswer[index];
                    for (let index = 0; index < element.questions.length; index++) {
                        const subElement = element.questions[index];
                        if (subElement.stepsPicID) {
                            await cloudinary.uploader.destroy(subElement.stepsPicID)
                        }
                    }
                }
                await answerModel.deleteMany({ solveBy: deleteStudent._id })
                const skippedNumber = (pageNumber - 1) * 20
                const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
                const countStudent = await userModel.countDocuments({ role: "Student", createdBy: schoolID });
                const allStudent = await userModel.find({ role: "Student", createdBy: schoolID }).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
                res.json({ message: "success", allStudent, numberOfStudent: countStudent, totalPage: Math.ceil(countStudent / 20) })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This student is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const removeStudentFromClass = async (req, res) => {
    try {
        const { studentID, classID } = req.params
        const findStudent = await userModel.findById(studentID)
        if (findStudent) {
            const removeFromClass = await userModel.findByIdAndUpdate(studentID, { $unset: { class: 1 } })
            if (removeFromClass) {
                const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
                const allStudent = await userModel.find({ createdBy: schoolID, class: classID }).select('userName')
                res.json({ message: "success", allStudent })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This student is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const search = async (req, res) => {
    try {
        const { searchKey } = req.params
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        let findStudent = await userModel.find({ 'userName': { $regex: searchKey, $options: 'i' }, role: "Student", createdBy: schoolID }).select('userName email class').populate({ path: 'class', select: 'class' })
        if (findStudent.length != 0) {
            res.json({ message: 'success', allStudent: findStudent })
        } else {
            res.json({ message: 'There are no student available with this name' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getClass = async (req, res) => {
    try {
        const studentID = req.userData._id
        let findStudent = await userModel.findById(studentID).select('class').populate({
            path: 'class',
            select: 'class teachers',
            populate: {
                path: 'teachers',
                select: 'userName subject',
                populate: {
                    path: 'subject',
                    select: 'schoolSubjectName',
                }
            }
        })
        if (findStudent) {
            res.json({ message: 'success', studentData: findStudent })
        } else {
            res.json({ message: 'There are no student available with this id' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAssignment = async (req, res) => {
    try {
        const studentID = req.userData._id
        const { teacherID } = req.params
        let findStudent = await userModel.findById(studentID).select('class')
        if (findStudent) {
            const getAssignment = await assignmentModel.find({ createdBy: teacherID }).select('-questions').sort({ _id: -1 })
            if (getAssignment.length != 0) {
                const allAssignment = []
                for (let index = 0; index < getAssignment.length; index++) {
                    const element = getAssignment[index];
                    if (element.classes.includes(findStudent.class)) {
                        allAssignment.push(element)
                    }
                }
                res.json({ message: 'success', allAssignment })
            } else {
                res.json({ message: 'There are no assignment available now' })
            }
        } else {
            res.json({ message: 'There are no student available with this id' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAssignmentDetails = async (req, res) => {
    try {
        const { assignmentID } = req.params
        const studentID = req.userData._id
        let assignment = await assignmentModel.findById(assignmentID).select('-classes -createdBy').populate({ path: 'questions', select: '-correctAnswer -questionPicID -wrongAnswerID -chapter' })
        if (assignment) {
            if (assignment.startDate) {
                if (checkExpiration(assignment.startDate, assignment.endDate)) {
                    res.json({ message: "Oops!!You can't open this assignment, it has expired." })
                    return;
                }
            }
            const findStudent = assignment.students?.filter(e => String(e.solveBy) == String(studentID))[0]
            if (findStudent) {
                if (findStudent.attempts >= assignment.attemptsNumber) {
                    res.json({ message: "Oops!!You can't open this assignment, your number of attempts has expired." })
                } else {
                    const findIndex = assignment.students?.findIndex(object => String(object.solveBy) == String(studentID))
                    const currentAttemptNumber = findStudent.attempts + 1
                    assignment.students[findIndex].attempts = currentAttemptNumber
                    await assignment.save()
                    
                    // Find answer for current attempt (not previous attempts)
                    const findAnswer = await answerModel.findOne({ 
                        solveBy: studentID, 
                        assignment: assignmentID,
                        attemptNumber: currentAttemptNumber
                    }).select('questions')
                    
                    assignment = assignment.toObject();
                    
                    // Include attempt information in response
                    assignment.currentAttempt = currentAttemptNumber;
                    assignment.totalAttempts = assignment.attemptsNumber;
                    assignment.remainingAttempts = assignment.attemptsNumber - currentAttemptNumber;
                    
                    // Only pre-fill answers if this attempt already has saved answers
                    if (findAnswer) {
                        assignment.questions.forEach(question => {
                            const answerObj = findAnswer?.questions.find(e => e.question.toString() === question._id.toString());
                            if (answerObj && answerObj.firstAnswer !== undefined) {
                                question.questionAnswer = answerObj.firstAnswer;
                            }
                        });
                    }
                    
                    res.json({ message: "success", assignment })
                }
            } else {
                const newStudent = {}
                newStudent.attempts = 1
                newStudent.solveBy = studentID
                assignment.students.push(newStudent)
                await assignment.save()
                
                assignment = assignment.toObject();
                assignment.currentAttempt = 1;
                assignment.totalAttempts = assignment.attemptsNumber;
                assignment.remainingAttempts = assignment.attemptsNumber - 1;
                
                res.json({ message: "success", assignment })
            }
        } else {
            res.json({ message: "There is no any assignment yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}


module.exports = { addStudent, getStudent, updateStudent, deleteStudent, removeStudentFromClass, search, getClass, getAssignment, getAssignmentDetails }