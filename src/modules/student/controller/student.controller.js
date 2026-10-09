const userModel = require('../../../../DB/models/user.model')
const classModel = require('../../../../DB/models/class.model')
const assignmentModel = require('../../../../DB/models/assignment.model')
const answerModel = require('../../../../DB/models/answer.model')
const mongoose = require('mongoose')

const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const bcrypt = require('bcryptjs');
const { shuffleAndBalanceMCQ } = require('../../../services/mcqShuffle.service');

// Helper to find all students belonging to a teacher either directly or via assigned classes
const getTeacherStudentQuery = async (teacherID, schoolID) => {
    const teacherDoc = await userModel.findById(teacherID).select('classList');
    const teacherClassIds = (teacherDoc?.classList || []).map(id => id.toString());

    const classesWithTeacher = await classModel.find({
        $or: [
            { teachers: teacherID },
            { _id: { $in: teacherDoc?.classList || [] } }
        ]
    }).select('_id');

    classesWithTeacher.forEach(c => {
        const cStr = c._id.toString();
        if (!teacherClassIds.includes(cStr)) {
            teacherClassIds.push(cStr);
        }
    });

    const classObjectIds = teacherClassIds.map(id => new mongoose.Types.ObjectId(id));

    const orClauses = [
        { teacher: teacherID },
        { teacherList: teacherID },
        { class: { $in: classObjectIds } },
        { classList: { $in: classObjectIds } }
    ];

    if (schoolID) {
        orClauses.forEach(clause => {
            if (clause.teacher || clause.teacherList) {
                clause.createdBy = schoolID;
            }
        });
    }

    return {
        role: "Student",
        $or: orClauses
    };
};

const getStudent = async (req, res) => {
    try {
        const { pageNumber } = req.params
        const isAll = req.query.all === 'true' || pageNumber === 'all' || req.query.limit === 'all';
        const page = parseInt(pageNumber, 10) || 1;
        const limit = isAll ? 0 : (parseInt(req.query.limit, 10) || 20);
        const skippedNumber = isAll ? 0 : (page - 1) * limit;

        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        if ((req.userData.role === 'IT' || req.userData.role === 'Teacher') && !schoolID) {
            return res.json({ message: "Your account is not linked to any school." })
        }
        
        let query = { role: "Student" }
        if (req.userData.role === 'Teacher') {
            query = await getTeacherStudentQuery(req.userData._id, schoolID);
        } else if (schoolID) {
            query.createdBy = schoolID;
        }

        let studentQuery = userModel.find(query).select('userName email class').populate({ path: 'class', select: 'class' });
        if (!isAll && limit > 0) {
            studentQuery = studentQuery.skip(skippedNumber).limit(limit);
        }
        const allStudent = await studentQuery;
        const countStudent = await userModel.countDocuments(query);
        if (allStudent.length != 0) {
            res.json({ 
                message: "success", 
                allStudent, 
                numberOfStudent: countStudent, 
                totalPage: isAll ? 1 : Math.ceil(countStudent / (limit || 20)) 
            });
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        if ((req.userData.role === 'IT' || req.userData.role === 'Teacher') && !schoolID) {
            return res.json({ message: "Your account is not linked to any school. Please contact your school administrator to link your account before creating students." })
        }
        const findStudent = await userModel.findOne({ userName, role: "Student", createdBy: schoolID })
        if (findStudent) {
            res.json({ message: "This student name is already registered" })
        } else {
            if (req.userData.role === 'Teacher') {
                const maxStudents = req.userData.maxStudents;
                if (maxStudents !== undefined && maxStudents !== null && maxStudents > 0) {
                    const teacherQuery = await getTeacherStudentQuery(req.userData._id, schoolID);
                    const currentStudentCount = await userModel.countDocuments(teacherQuery);
                    if (currentStudentCount >= maxStudents) {
                        return res.json({ message: `You have reached your limit of ${maxStudents} students.` });
                    }
                }
            }
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
            if (req.userData.role === 'Teacher') {
                req.body.teacher = req.userData._id
            }
            const addStudent = new userModel(req.body)
            await addStudent.save()

            let query = { role: "Student" }
            if (req.userData.role === 'Teacher') {
                query = await getTeacherStudentQuery(req.userData._id, schoolID);
            } else if (schoolID) {
                query.createdBy = schoolID;
            }
            const allStudent = await userModel.find(query).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
            const countStudent = await userModel.countDocuments(query);
            res.json({ message: "success", allStudent, numberOfStudent: countStudent, totalPage: Math.ceil(countStudent / 20) })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateStudent = async (req, res) => {
    try {
        const { studentID, pageNumber } = req.params
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        if ((req.userData.role === 'IT' || req.userData.role === 'Teacher') && !schoolID) {
            return res.json({ message: "Your account is not linked to any school." })
        }
        if (req.userData.role === 'Teacher') {
            const teacherQuery = await getTeacherStudentQuery(req.userData._id, schoolID);
            const verifyStudent = await userModel.findOne({ _id: studentID, ...teacherQuery });
            if (!verifyStudent) {
                return res.json({ message: "You do not have access to update this student" })
            }
        }
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
            let query = { role: "Student" }
            if (req.userData.role === 'Teacher') {
                query = await getTeacherStudentQuery(req.userData._id, schoolID);
            } else if (schoolID) {
                query.createdBy = schoolID;
            }
            const countStudent = await userModel.countDocuments(query);
            const allStudent = await userModel.find(query).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        let findStudentQuery = { _id: studentID, role: 'Student' }
        if (req.userData.role === 'Teacher') {
            const teacherQuery = await getTeacherStudentQuery(req.userData._id, schoolID);
            findStudentQuery = { _id: studentID, ...teacherQuery };
        } else if (schoolID) {
            findStudentQuery.createdBy = schoolID;
        }
        const findStudent = await userModel.findOne(findStudentQuery)
        if (findStudent) {
            const deleteStudent = await userModel.findByIdAndDelete(studentID)
            if (deleteStudent) {
                try {
                    const findAnswer = await answerModel.find({ solveBy: deleteStudent._id })
                    for (let index = 0; index < findAnswer.length; index++) {
                        const element = findAnswer[index];
                        for (let index = 0; index < element.questions.length; index++) {
                            const subElement = element.questions[index];
                            if (subElement.stepsPicID) {
                                try {
                                    await cloudinary.uploader.destroy(subElement.stepsPicID)
                                } catch (cErr) {
                                    console.error("Cloudinary cleanup error:", cErr.message);
                                }
                            }
                        }
                    }
                    await answerModel.deleteMany({ solveBy: deleteStudent._id })
                } catch (ansErr) {
                    console.error("Answer cleanup error:", ansErr.message);
                }
                const skippedNumber = (pageNumber - 1) * 20
                let query = { role: "Student" }
                if (req.userData.role === 'Teacher') {
                    query = await getTeacherStudentQuery(req.userData._id, schoolID);
                } else if (schoolID) {
                    query.createdBy = schoolID;
                }
                const countStudent = await userModel.countDocuments(query);
                const allStudent = await userModel.find(query).select('userName email class').populate({ path: 'class', select: 'class' }).skip(skippedNumber).limit(20)
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        let findStudentQuery = { _id: studentID, role: 'Student' }
        if (req.userData.role === 'Teacher') {
            const teacherQuery = await getTeacherStudentQuery(req.userData._id, schoolID);
            findStudentQuery = { _id: studentID, ...teacherQuery };
        } else if (schoolID) {
            findStudentQuery.createdBy = schoolID;
        }
        const findStudent = await userModel.findOne(findStudentQuery)
        if (findStudent) {
            const removeFromClass = await userModel.findByIdAndUpdate(studentID, { $unset: { class: 1 } })
            if (removeFromClass) {
                const query = { class: classID, role: 'Student' }
                const allStudent = await userModel.find(query).select('userName')
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        let query = { 'userName': { $regex: searchKey, $options: 'i' }, role: "Student" }
        if (req.userData.role === 'Teacher') {
            const teacherQuery = await getTeacherStudentQuery(req.userData._id, schoolID);
            query = {
                'userName': { $regex: searchKey, $options: 'i' },
                ...teacherQuery
            };
        } else if (schoolID) {
            query.createdBy = schoolID;
        }
        let findStudent = await userModel.find(query).select('userName email class').populate({ path: 'class', select: 'class' })
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
        let findStudent = await userModel.findById(studentID).select('class classList teacher teacherList').populate([
            {
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
            },
            {
                path: 'teacher',
                select: 'userName subject',
                populate: {
                    path: 'subject',
                    select: 'schoolSubjectName'
                }
            },
            {
                path: 'teacherList',
                select: 'userName subject',
                populate: {
                    path: 'subject',
                    select: 'schoolSubjectName'
                }
            }
        ])
        if (findStudent) {
            let teachersList = [...(findStudent.class?.teachers || [])];
            if (findStudent.teacher && !teachersList.some(t => (t._id || t).toString() === (findStudent.teacher._id || findStudent.teacher).toString())) {
                teachersList.push(findStudent.teacher);
            }
            if (findStudent.teacherList && Array.isArray(findStudent.teacherList)) {
                findStudent.teacherList.forEach(t => {
                    if (t && !teachersList.some(existing => (existing._id || existing).toString() === (t._id || t).toString())) {
                        teachersList.push(t);
                    }
                });
            }

            const studentDataObj = findStudent.toObject ? findStudent.toObject() : { ...findStudent };
            if (studentDataObj.class) {
                studentDataObj.class.teachers = teachersList;
            }
            res.json({ message: 'success', studentData: studentDataObj })
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
                        // Check if this student has a completed answer for this assignment
                        const completedAnswer = await answerModel.findOne({
                            solveBy: studentID,
                            assignment: element._id,
                            total: { $exists: true, $ne: null }
                        }).select('total questionsNumber').lean()

                        const assignmentObj = element.toObject()
                        assignmentObj.isCompleted = !!completedAnswer
                        if (completedAnswer) {
                            assignmentObj.resultScore = completedAnswer.total
                            assignmentObj.resultTotal = completedAnswer.questionsNumber
                        }
                        allAssignment.push(assignmentObj)
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

const sanitizeAssignmentQuestions = (assignmentObj) => {
    if (assignmentObj && Array.isArray(assignmentObj.questions)) {
        assignmentObj.questions = shuffleAndBalanceMCQ(assignmentObj.questions, { sanitize: true });
    }
    return assignmentObj;
};

const getAssignmentDetails = async (req, res) => {
    try {
        const { assignmentID } = req.params
        const studentID = req.userData._id
        let assignment = await assignmentModel.findById(assignmentID).select('-classes -createdBy').populate({ path: 'questions', select: '-questionPicID -wrongAnswerID -chapter' })
        if (assignment) {
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
                    assignment = sanitizeAssignmentQuestions(assignment);
                    
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
                assignment = sanitizeAssignmentQuestions(assignment);
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