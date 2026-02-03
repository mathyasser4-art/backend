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
        const { assignmentID } = req.params
        const removeAssignment = await assignmentModel.findByIdAndDelete(assignmentID)
        if (removeAssignment) {
            const getAssignment = await assignmentModel.find({ createdBy: teacherID }).select('-createdBy').populate([{ path: 'questions', select: '-chapter' }, { path: 'classes', select: 'class' }, { path: 'students.solveBy', select: 'userName' }]).sort({ _id: -1 })
            res.json({ message: "success", allAssignment: getAssignment })
        } else {
            res.json({ message: "This assignment is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

// NEW: Duplicate/Re-assign an assignment
const duplicateAssignment = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { assignmentID } = req.params;
        
        console.log('=== duplicateAssignment START ===');
        console.log('Teacher ID:', teacherID);
        console.log('Assignment ID to duplicate:', assignmentID);
        console.log('New assignment data:', req.body);

        // Find the original assignment
        const originalAssignment = await assignmentModel.findById(assignmentID);
        
        if (!originalAssignment) {
            console.log('ERROR: Original assignment not found');
            return res.status(404).json({ message: "Original assignment not found" });
        }

        // Verify teacher owns this assignment
        if (String(originalAssignment.createdBy) !== String(teacherID)) {
            console.log('ERROR: Teacher does not own this assignment');
            return res.status(403).json({ message: "You don't have permission to duplicate this assignment" });
        }

        console.log('Original assignment found:', originalAssignment.title);

        // Create new assignment based on original, but with new data from request
        const today = new Date().toISOString().slice(0, 10);
        
        const newAssignmentData = {
            // Copy from original assignment
            questions: originalAssignment.questions, // Same questions
            totalPoints: originalAssignment.totalPoints, // Same total points
            
            // Use new data from request body (title, dates, timer, attempts, classes)
            title: req.body.title,
            timer: req.body.timer,
            attemptsNumber: req.body.attemptsNumber || 1,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
            classes: req.body.classes,
            
            // New metadata
            createdBy: teacherID,
            createdAt: today,
            students: [] // Start with no students (they haven't taken it yet)
        };

        console.log('Creating new assignment with data:', newAssignmentData);

        const newAssignment = new assignmentModel(newAssignmentData);
        await newAssignment.save();

        console.log('New assignment created with ID:', newAssignment._id);

        // Get all assignments to return to frontend
        const allAssignments = await assignmentModel
            .find({ createdBy: teacherID })
            .select('-createdBy')
            .populate([
                { path: 'questions', select: '-chapter' },
                { path: 'classes', select: 'class' },
                { path: 'students.solveBy', select: 'userName' }
            ])
            .sort({ _id: -1 });

        console.log('=== duplicateAssignment END ===');
        
        res.json({ 
            message: "success", 
            allAssignment: allAssignments,
            newAssignmentId: newAssignment._id
        });
        
    } catch (error) {
        console.error('=== duplicateAssignment ERROR ===');
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(502).json({ message: error.message });
    }
};

const getStudentResults = async (req, res) => {
    try {
        const { assignmentID } = req.params;
        const teacherID = req.userData._id;

        console.log('=== getStudentResults START ===');
        console.log('Assignment ID:', assignmentID);
        console.log('Teacher ID:', teacherID);

        // Get the assignment and verify teacher owns it
        const assignment = await assignmentModel.findById(assignmentID)
            .populate('questions');

        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
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
            .populate('solveBy', 'userName email')
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
                userName: answer.solveBy.userName,
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

// FIXED: Add getStudentResults and duplicateAssignment to the exports
module.exports = { 
    createAssignment, 
    getAssignment, 
    updateAssignment, 
    deleteAssignment,
    getStudentResults,
    duplicateAssignment  // ADD THIS LINE
}
