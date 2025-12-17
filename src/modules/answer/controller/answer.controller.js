const questionModel = require('../../../../DB/models/question.model')
const answerModel = require('../../../../DB/models/answer.model')
const assignmentModel = require('../../../../DB/models/assignment.model')
const checkAnswer = require('../../../services/checkAnswer')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const fs = require('fs');

const getResult = async (req, res) => {
    try {
        const { assignmentID } = req.params;
        const { time } = req.query;
        const studentID = req.userData._id;

        console.log('=== getResult START ===');
        console.log('getResult - Received time from query:', time);
        console.log('getResult - Assignment ID:', assignmentID);
        console.log('getResult - Student ID:', studentID);

        const findAnswer = await answerModel.findOne({ solveBy: studentID, assignment: assignmentID });

        if (findAnswer) {
            console.log('getResult - Previous time in DB:', findAnswer.time);
            findAnswer.time = time || "0:00";
            console.log('getResult - New time to save:', findAnswer.time);

            const assignment = await assignmentModel.findById(assignmentID)
                .populate({
                    path: 'questions',
                    select: 'questionPoints correctAnswer typeOfAnswer answer autoCorrect'
                });

            let totalSummation = 0;
            let studentTotalScore = 0;

            if (assignment && assignment.questions) {
                assignment.questions.forEach(question => {
                    totalSummation += question.questionPoints;

                    const studentAnswerForQuestion = findAnswer.questions.find(
                        (ans) => ans.question.toString() === question._id.toString()
                    );

                    if (studentAnswerForQuestion) {
                        let isCorrect = false;
                        
                        // Auto-grade all question types using the same logic as checkAnswer service
                        if (question.typeOfAnswer === 'MCQ') {
                            // MCQ: Compare with correctAnswer using loose equality
                            if (studentAnswerForQuestion.firstAnswer && 
                                question.correctAnswer == studentAnswerForQuestion.firstAnswer) {
                                isCorrect = true;
                            }
                        } else if (question.typeOfAnswer === 'Essay') {
                            // Essay: Check if answer is in the answer array
                            if (studentAnswerForQuestion.firstAnswer && 
                                question.answer && question.answer.length > 0) {
                                isCorrect = question.answer.includes(studentAnswerForQuestion.firstAnswer);
                            }
                        } else if (question.typeOfAnswer === 'Graph') {
                            // Graph: Compare uploaded image URL with correctPicAnswer
                            if (studentAnswerForQuestion.stepPicture && 
                                studentAnswerForQuestion.stepPicture.secure_url && 
                                question.correctPicAnswer) {
                                isCorrect = studentAnswerForQuestion.stepPicture.secure_url == question.correctPicAnswer;
                            }
                        }
                        
                        // Assign points based on correctness
                        if (isCorrect) {
                            studentTotalScore += question.questionPoints;
                            studentAnswerForQuestion.point = question.questionPoints;
                        } else {
                            studentAnswerForQuestion.point = 0;
                        }
                        studentAnswerForQuestion.isCorrect = isCorrect;
                    }
                });
            }

            findAnswer.total = studentTotalScore;

            const findIndex = assignment.students?.findIndex(object => String(object.solveBy) == String(studentID));
            if (findIndex !== -1) {
                assignment.students[findIndex].attempts = assignment.attemptsNumber;
                await assignment.save();
            }

            await findAnswer.save();

            console.log('getResult - Final total score:', findAnswer.total);
            console.log('getResult - Total possible points:', totalSummation);
            console.log('getResult - Saved time to DB:', findAnswer.time);
            console.log('getResult - Sending response with time:', findAnswer.time);
            console.log('=== getResult END ===\n');

            res.json({
                message: "success",
                result: {
                    total: findAnswer.total,
                    questionsNumber: findAnswer.questionsNumber,
                    time: findAnswer.time
                },
                totalSummation,
            });
        } else {
            console.log('ERROR: No answer document found for student');
            res.status(404).json({ message: "Student answers not found" });
        }
    } catch (error) {
        console.error('=== getResult ERROR ===');
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: "An error occurred while calculating the result.", error: error.message });
    }
};

const checkAssinmentAnswer = async (req, res) => {
    try {
        const { questionID, assignmentID } = req.params;
        const studentID = req.userData._id;
        const { firstAnswer, secondAnswer, thirdAnswer, fourthAnswer, questionAnswer } = req.body;

        console.log('=== checkAssinmentAnswer START ===');
        console.log('Student ID:', studentID);
        console.log('Question ID:', questionID);
        console.log('Assignment ID:', assignmentID);
        console.log('Request body:', { firstAnswer, secondAnswer, thirdAnswer, fourthAnswer, questionAnswer });

        const question = await questionModel.findById(questionID);
        if (!question) {
            console.log('ERROR: Question not found for ID:', questionID);
            return res.status(404).json({ message: "Question not found" });
        }

        console.log('Question found:', {
            type: question.typeOfAnswer,
            correctAnswer: question.correctAnswer,
            answerArray: question.answer,
            points: question.questionPoints
        });

        let findAnswer = await answerModel.findOne({ solveBy: studentID, assignment: assignmentID });

        if (!findAnswer) {
            console.log('Creating new answer document for student');
            findAnswer = await answerModel.create({
                solveBy: studentID,
                assignment: assignmentID,
                questionsNumber: 0,
                questions: []
            });
            console.log('New answer document created with ID:', findAnswer._id);
        } else {
            console.log('Found existing answer document with ID:', findAnswer._id);
            console.log('Current questions count:', findAnswer.questions.length);
        }

        const questionIndex = findAnswer.questions.findIndex(q => q.question.toString() === questionID);

        // Determine the answer to save and check
        // questionAnswer is sent from frontend at exam end, firstAnswer is sent during quiz
        const answerToSave = questionAnswer || firstAnswer;
        let answerToCheck;
        
        if (question.typeOfAnswer === 'Graph' && req.file) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(req.file.path, { folder: `abacus-heroes/assignments/${assignmentID}/questions/${questionID}/answers` });
            answerToCheck = secure_url;
            
            if (questionIndex > -1) {
                findAnswer.questions[questionIndex].stepPicture = { secure_url, public_id };
            }
            fs.unlinkSync(req.file.path);
        } else {
            answerToCheck = answerToSave;
        }

        // Check if the answer is correct using the checkAnswer service
        const isCorrect = checkAnswer(question, answerToCheck);
        
        console.log('checkAssinmentAnswer - Question:', questionID);
        console.log('checkAssinmentAnswer - Answer to check:', answerToCheck);
        console.log('checkAssinmentAnswer - Correct answer:', question.correctAnswer || question.answer);
        console.log('checkAssinmentAnswer - Is correct:', isCorrect);

        if (questionIndex > -1) {
            // Update existing answer
            if (question.typeOfAnswer !== 'Graph' || !req.file) {
                findAnswer.questions[questionIndex].firstAnswer = answerToSave || findAnswer.questions[questionIndex].firstAnswer;
                findAnswer.questions[questionIndex].secondAnswer = secondAnswer || findAnswer.questions[questionIndex].secondAnswer;
                findAnswer.questions[questionIndex].thirdAnswer = thirdAnswer || findAnswer.questions[questionIndex].thirdAnswer;
                findAnswer.questions[questionIndex].fourthAnswer = fourthAnswer || findAnswer.questions[questionIndex].fourthAnswer;
            }
            findAnswer.questions[questionIndex].isCorrect = isCorrect;
            findAnswer.questions[questionIndex].point = isCorrect ? question.questionPoints : 0;
        } else {
            // Add new question answer
            const newQuestionAnswer = {
                question: questionID,
                firstAnswer: answerToSave,
                secondAnswer: secondAnswer || '',
                thirdAnswer: thirdAnswer || '',
                fourthAnswer: fourthAnswer || '',
                attempts: 1,
                isCorrect: isCorrect,
                point: isCorrect ? question.questionPoints : 0
            };

            if (question.typeOfAnswer === 'Graph' && req.file) {
                newQuestionAnswer.stepPicture = { secure_url, public_id };
            }
            findAnswer.questions.push(newQuestionAnswer);
            findAnswer.questionsNumber = findAnswer.questions.length;
        }

        await findAnswer.save();

        console.log('Answer saved successfully');
        console.log('Total questions in answer document:', findAnswer.questions.length);
        console.log('Answer document ID:', findAnswer._id);
        console.log('=== checkAssinmentAnswer END ===\n');

        res.status(200).json({ 
            message: "success", 
            isCorrect: isCorrect,
            answer: findAnswer.questions[questionIndex > -1 ? questionIndex : findAnswer.questions.length - 1]
        });

    } catch (error) {
        console.error('=== checkAssinmentAnswer ERROR ===');
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Error saving answer", error: error.message });
    }
};

const getAssignmentAnswer = async (req, res) => {
    try {
        const { studentID, assignmentID } = req.params;

        console.log('=== getAssignmentAnswer START ===');
        console.log('Student ID:', studentID);
        console.log('Assignment ID:', assignmentID);

        // Find the student's answers for this assignment
        const answers = await answerModel.findOne({ 
            solveBy: studentID, 
            assignment: assignmentID 
        }).populate({
            path: 'assignment',
            select: 'title totalPoints questions'
        });

        if (!answers) {
            console.log('ERROR: No answers found for this student/assignment combination');
            return res.status(404).json({ message: "No answers found for this assignment" });
        }

        console.log('Answer document found with ID:', answers._id);
        console.log('Number of questions answered:', answers.questions.length);
        console.log('Total score:', answers.total);
        console.log('Time taken:', answers.time);

        // Get all questions with their details
        const questionIds = answers.questions.map(q => q.question);
        console.log('Looking up questions with IDs:', questionIds);
        
        const questions = await questionModel.find({
            _id: { $in: questionIds }
        });

        console.log('Found', questions.length, 'questions in database');

        // Build the report with question details
        const report = {
            questions: answers.questions.map(studentAnswer => {
                const question = questions.find(q => q._id.toString() === studentAnswer.question.toString());
                
                return {
                    _id: studentAnswer._id,
                    question: question?.question || '',
                    questionPic: question?.questionPic?.secure_url || null,
                    firstAnswer: studentAnswer.firstAnswer || '',
                    secondAnswer: studentAnswer.secondAnswer || '',
                    stepsPic: studentAnswer.stepPicture?.secure_url || null,
                    isCorrect: studentAnswer.isCorrect || false,
                    notAnswer: !studentAnswer.firstAnswer && !studentAnswer.secondAnswer,
                    questionPoints: question?.questionPoints || 0,
                    point: studentAnswer.point || 0
                };
            })
        };

        console.log('Report generated with', report.questions.length, 'questions');
        console.log('=== getAssignmentAnswer END ===\n');

        res.json({
            message: "success",
            answers: {
                assignment: answers.assignment,
                time: answers.time || "0:00",
                total: answers.total || 0,
                questionsNumber: answers.questionsNumber || 0
            },
            report
        });

    } catch (error) {
        console.error('=== getAssignmentAnswer ERROR ===');
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            message: "An error occurred while fetching assignment answers.", 
            error: error.message 
        });
    }
};

const correctAnswer = async (req, res) => {
    try {
        const { studentID, assignmentID, questionID } = req.params;
        const { grade } = req.body;

        const findAnswer = await answerModel.findOne({ 
            solveBy: studentID, 
            assignment: assignmentID 
        });

        if (!findAnswer) {
            return res.status(404).json({ message: "Student answers not found" });
        }

        const questionIndex = findAnswer.questions.findIndex(
            q => q.question.toString() === questionID
        );

        if (questionIndex === -1) {
            return res.status(404).json({ message: "Question answer not found" });
        }

        // Update the grade and mark as correct
        findAnswer.questions[questionIndex].point = parseFloat(grade) || 0;
        findAnswer.questions[questionIndex].isCorrect = true;

        // Recalculate total
        let newTotal = 0;
        findAnswer.questions.forEach(q => {
            if (q.point) {
                newTotal += q.point;
            }
        });
        findAnswer.total = newTotal;

        await findAnswer.save();

        res.json({
            message: "success",
            updatedAnswer: findAnswer
        });

    } catch (error) {
        res.status(500).json({ 
            message: "An error occurred while correcting the answer.", 
            error: error.message 
        });
    }
};

const getStudentOwnReport = async (req, res) => {
    try {
        const { assignmentID } = req.params;
        const studentID = req.userData._id; // Get student ID from auth token

        // Find the student's answers for this assignment
        const answers = await answerModel.findOne({ 
            solveBy: studentID, 
            assignment: assignmentID 
        }).populate({
            path: 'assignment',
            select: 'title totalPoints questions'
        });

        if (!answers) {
            return res.status(404).json({ message: "No answers found for this assignment" });
        }

        // Get all questions with their details
        const questions = await questionModel.find({
            _id: { $in: answers.questions.map(q => q.question) }
        });

        // Build the report with question details
        const report = {
            questions: answers.questions.map(studentAnswer => {
                const question = questions.find(q => q._id.toString() === studentAnswer.question.toString());
                
                return {
                    _id: studentAnswer._id,
                    question: question?.question || '',
                    questionPic: question?.questionPic?.secure_url || null,
                    firstAnswer: studentAnswer.firstAnswer || '',
                    secondAnswer: studentAnswer.secondAnswer || '',
                    stepsPic: studentAnswer.stepPicture?.secure_url || null,
                    isCorrect: studentAnswer.isCorrect || false,
                    notAnswer: !studentAnswer.firstAnswer && !studentAnswer.secondAnswer,
                    questionPoints: question?.questionPoints || 0,
                    point: studentAnswer.point || 0
                };
            })
        };

        res.json({
            message: "success",
            answers: {
                assignment: answers.assignment,
                time: answers.time || "0:00",
                total: answers.total || 0,
                questionsNumber: answers.questionsNumber || 0
            },
            report
        });

    } catch (error) {
        res.status(500).json({ 
            message: "An error occurred while fetching your assignment report.", 
            error: error.message 
        });
    }
};

// Debug endpoint to inspect answer documents
const debugAnswerDocument = async (req, res) => {
    try {
        const { studentID, assignmentID } = req.params;
        
        console.log('=== DEBUG: Inspecting Answer Document ===');
        console.log('Student ID:', studentID);
        console.log('Assignment ID:', assignmentID);
        
        const answer = await answerModel.findOne({ 
            solveBy: studentID, 
            assignment: assignmentID 
        }).populate('assignment').populate('questions.question');
        
        if (!answer) {
            return res.json({
                found: false,
                message: 'No answer document found for this student/assignment'
            });
        }
        
        const debugInfo = {
            found: true,
            documentId: answer._id,
            studentId: answer.solveBy,
            assignmentId: answer.assignment?._id,
            assignmentTitle: answer.assignment?.title,
            time: answer.time,
            total: answer.total,
            questionsNumber: answer.questionsNumber,
            questionsCount: answer.questions.length,
            questions: answer.questions.map((q, index) => ({
                index: index + 1,
                questionId: q.question?._id,
                questionText: q.question?.question?.substring(0, 50) + '...',
                questionType: q.question?.typeOfAnswer,
                firstAnswer: q.firstAnswer,
                secondAnswer: q.secondAnswer,
                isCorrect: q.isCorrect,
                point: q.point,
                attempts: q.attempts
            }))
        };
        
        console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
        
        res.json(debugInfo);
        
    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Note: correctAnswer function kept for backward compatibility but not exposed in routes
module.exports = { checkAssinmentAnswer, getAssignmentAnswer, getResult, getStudentOwnReport, debugAnswerDocument }