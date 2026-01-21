const assignmentModel = require('../../../../DB/models/assignment.model')
const answerModel = require('../../../../DB/models/answer.model')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const mongoose = require('mongoose')

const createAssignment = async (req, res) => {
    try {
        const teacherID = req.userData._id
        const today = new Date().toISOString().slice(0, 10)
        req.body.createdAt = today
        req.body.createdBy = teacherID
        const addAssignment = new assignmentModel(req.body)
        await addAssignment.save()
        res.json({ message: "success" })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAssignment = async (req, res) => {
    try {
        const teacherID = req.userData._id
        const allAssignment = await assignmentModel.find({ createdBy: teacherID }).populate({ path: 'questions', select: '-correctAnswer -questionPicID -wrongAnswerID -chapter' }).sort({ _id: -1 })
        if (allAssignment.length != 0) {
            res.json({ message: "success", allAssignment })
        } else {
            res.json({ message: "There is no any assignment yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateAssignment = async (req, res) => {
    try {
        const teacherID = req.userData._id
        const { assignmentID } = req.params
        const findAssignment = await assignmentModel.findById(assignmentID)
        if (findAssignment) {
            const updateAssignment = await assignmentModel.findByIdAndUpdate(assignmentID, req.body)
            if (updateAssignment) {
                const getAssignment = await assignmentModel.find({ createdBy: teacherID }).select('-createdBy').populate([{ path: 'questions', select: '-chapter' }, { path: 'classes', select: 'class' }, { path: 'students.solveBy', select: 'userName' }]).sort({ _id: -1 })
                res.json({ message: "success", allAssignment: getAssignment })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This assignment is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteAssignment = async (req, res) => {
    try {
        const teacherID = req.userData._id
        let { assignmentID } = req.params
        const findAssignment = await assignmentModel.findById(assignmentID)
        if (findAssignment) {
            const deleteAssignment = await assignmentModel.findByIdAndDelete(assignmentID)
            if (deleteAssignment) {
                assignmentID = new mongoose.Types.ObjectId(assignmentID)
                const findAnswer = await answerModel.find({ assignment: assignmentID })
                for (let index = 0; index < findAnswer.length; index++) {
                    const element = findAnswer[index];
                    for (let index = 0; index < element.questions.length; index++) {
                        const subElement = element.questions[index];
                        if (subElement.stepsPicID) {
                            await cloudinary.uploader.destroy(subElement.stepsPicID)
                        }
                    }
                }
                await answerModel.deleteMany({ assignment: assignmentID })
                const getAssignment = await assignmentModel.find({ createdBy: teacherID }).select('-createdBy').populate([{ path: 'questions', select: '-chapter' }, { path: 'classes', select: 'class' }, { path: 'students.solveBy', select: 'userName' }]).sort({ _id: -1 })
                res.json({ message: "success", allAssignment: getAssignment })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This assignment is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

// Add this function to your assignment controller file
const getStudentResults = async (req, res) => {
    try {
        const { assignmentID } = req.params;
        const teacherID = req.userData._id;

        // Verify teacher owns this assignment
        const assignment = await assignmentModel.findById(assignmentID);
        if (!assignment) {
            return res.json({ message: "Assignment not found" });
        }

        // Check if teacher created this assignment
        if (String(assignment.createdBy) !== String(teacherID)) {
            return res.status(403).json({ message: "Access denied - You don't own this assignment" });
        }

        // Get all answers for this assignment with student information
        // #region agent log
        const mongoose = require('mongoose');
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignment/controller/assignment.controller.js:107',message:'getStudentResults - query attempt',data:{assignmentID:assignmentID,assignmentIDType:typeof assignmentID,isValidObjectId:mongoose.Types.ObjectId.isValid(assignmentID)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'STUDENT_RESULTS'})}).catch(()=>{});
        // #endregion
        
        const answers = await answerModel.find({ assignment: assignmentID })
            .populate('solveBy', 'name email')
            .select('total questionsNumber time createdAt questions');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignment/controller/assignment.controller.js:111',message:'getStudentResults - query result',data:{answersFound:answers?.length || 0,answersWithQuestions:answers?.filter(a => a.questions?.length > 0).length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'STUDENT_RESULTS'})}).catch(()=>{});
        // #endregion

        // Calculate total points from assignment questions
        let totalPoints = 0;
        if (assignment.questions && assignment.questions.length > 0) {
            // You might need to populate questions to get points, or use assignment.totalPoints if available
            totalPoints = assignment.totalPoints || assignment.questions.reduce((sum, q) => sum + (q.questionPoints || 0), 0);
        }

        const students = answers.map(answer => {
            const percentage = totalPoints > 0 ? Math.round((answer.total / totalPoints) * 100) : 0;
            
            return {
                _id: answer._id,
                studentId: answer.solveBy._id,
                name: answer.solveBy.name,
                email: answer.solveBy.email,
                answeredQuestions: answer.questionsNumber,
                score: answer.total,
                totalPossible: totalPoints,
                timeSpent: answer.time || '0:00',
                percentage: percentage,
                completedAt: answer.createdAt,
                totalQuestions: assignment.questions ? assignment.questions.length : 0
            };
        });

        res.json({
            message: "success",
            students,
            assignment: {
                _id: assignment._id,
                title: assignment.title,
                totalPoints: totalPoints,
                totalQuestions: assignment.questions ? assignment.questions.length : 0,
                createdAt: assignment.createdAt
            }
        });
    } catch (error) {
        console.error('Error in getStudentResults:', error);
        res.status(502).json({ message: error.message });
    }
};

// FIXED: Add getStudentResults to the exports
module.exports = { 
    createAssignment, 
    getAssignment, 
    updateAssignment, 
    deleteAssignment,
    getStudentResults  // ADD THIS LINE
}