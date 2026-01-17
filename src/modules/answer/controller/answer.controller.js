const questionModel = require('../../../../DB/models/question.model')
const answerModel = require('../../../../DB/models/answer.model')
const assignmentModel = require('../../../../DB/models/assignment.model')
const checkAnswer = require('../../../services/checkAnswer')
const normalizeAnswer = require('../../../services/normalizeAnswer')
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

        // #region agent log
        const mongoose = require('mongoose');
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:22',message:'getResult - query attempt',data:{studentID:studentID?.toString(),studentIDType:typeof studentID,assignmentID:assignmentID,assignmentIDType:typeof assignmentID,isValidObjectId_studentID:mongoose.Types.ObjectId.isValid(studentID),isValidObjectId_assignmentID:mongoose.Types.ObjectId.isValid(assignmentID)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'GET_RESULT_QUERY'})}).catch(()=>{});
        // #endregion

        const findAnswer = await answerModel.findOne({ solveBy: studentID, assignment: assignmentID });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:24',message:'getResult - query result',data:{foundAnswer:!!findAnswer,answerDocId:findAnswer?._id?.toString(),questionsCount:findAnswer?.questions?.length || 0,solveByInDoc:findAnswer?.solveBy?.toString(),assignmentInDoc:findAnswer?.assignment?.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'GET_RESULT_QUERY'})}).catch(()=>{});
        // #endregion

        if (findAnswer) {
            console.log('getResult - Previous time in DB:', findAnswer.time);
            findAnswer.time = time || "0:00";
            console.log('getResult - New time to save:', findAnswer.time);

            const assignment = await assignmentModel.findById(assignmentID)
                .populate({
                    path: 'questions',
                    select: 'questionPoints correctAnswer typeOfAnswer answer correctPicAnswer autoCorrect'
                });

            console.log('=== ASSIGNMENT RETRIEVED ===');
            console.log('Assignment exists:', !!assignment);
            console.log('Assignment questions count:', assignment?.questions?.length || 0);
            
            if (assignment && assignment.questions) {
                console.log('=== QUESTIONS IN ASSIGNMENT ===');
                assignment.questions.forEach((q, idx) => {
                    console.log(`Question ${idx + 1}:`, {
                        id: q._id,
                        type: q.typeOfAnswer,
                        points: q.questionPoints,
                        correctAnswer: q.correctAnswer,
                        answerArray: q.answer,
                        correctPicAnswer: q.correctPicAnswer
                    });
                });
            }

            console.log('=== STUDENT ANSWERS ===');
            console.log('Total student answers:', findAnswer.questions.length);
            findAnswer.questions.forEach((ans, idx) => {
                console.log(`Student answer ${idx + 1}:`, {
                    questionId: ans.question,
                    firstAnswer: ans.firstAnswer,
                    secondAnswer: ans.secondAnswer
                });
            });

            let totalSummation = 0;
            let studentTotalScore = 0;

            if (assignment && assignment.questions) {
                assignment.questions.forEach(question => {
                    totalSummation += question.questionPoints;

                    const studentAnswerForQuestion = findAnswer.questions.find(
                        (ans) => ans.question.toString() === question._id.toString()
                    );

                    console.log(`\n=== CHECKING QUESTION ${question._id} ===`);
                    console.log('Question type:', question.typeOfAnswer);
                    console.log('Student answered this question:', !!studentAnswerForQuestion);
                    
                    if (studentAnswerForQuestion) {
                        console.log('Student answer found:', {
                            firstAnswer: studentAnswerForQuestion.firstAnswer,
                            type: typeof studentAnswerForQuestion.firstAnswer
                        });
                        console.log('Correct answer from DB:', {
                            correctAnswer: question.correctAnswer,
                            answerArray: question.answer,
                            correctPicAnswer: question.correctPicAnswer
                        });
                        let isCorrect = false;
                        
                        // Auto-grade all question types using the same logic as checkAnswer service
                        if (question.typeOfAnswer === 'MCQ') {
                            console.log('>>> Processing MCQ question');
                            
                            // MCQ: Normalize and compare answers
                            // FIX: Check for undefined/null instead of falsy to handle "0" answers
                            if (studentAnswerForQuestion.firstAnswer !== undefined && 
                                studentAnswerForQuestion.firstAnswer !== null) {
                                
                                console.log('>>> Student has an answer, checking correctAnswer field...');
                                console.log('>>> question.correctAnswer exists?', question.correctAnswer !== undefined && question.correctAnswer !== null);
                                console.log('>>> question.correctAnswer value:', question.correctAnswer);
                                
                                const normalizedStudentAnswer = normalizeAnswer(studentAnswerForQuestion.firstAnswer);
                                const normalizedCorrectAnswer = normalizeAnswer(question.correctAnswer);
                                
                                console.log('MCQ Comparison:');
                                console.log('  Student answer (raw):', studentAnswerForQuestion.firstAnswer);
                                console.log('  Student answer (normalized):', normalizedStudentAnswer);
                                console.log('  Correct answer (raw):', question.correctAnswer);
                                console.log('  Correct answer (normalized):', normalizedCorrectAnswer);
                                console.log('  Match:', normalizedCorrectAnswer === normalizedStudentAnswer);
                                
                                isCorrect = normalizedCorrectAnswer === normalizedStudentAnswer;
                            } else {
                                console.log('>>> Student answer is undefined/null');
                            }
                        } else if (question.typeOfAnswer === 'Essay') {
                            console.log('>>> Processing Essay question');
                            console.log('>>> question.answer array exists?', question.answer !== undefined && question.answer !== null);
                            console.log('>>> question.answer array length:', question.answer?.length || 0);
                            console.log('>>> question.answer content:', question.answer);
                            
                            // Essay: Normalize and check if answer is in the answer array (case-insensitive)
                            // FIX: Check for undefined/null instead of falsy to handle "0" or "" answers
                            if (studentAnswerForQuestion.firstAnswer !== undefined && 
                                studentAnswerForQuestion.firstAnswer !== null && 
                                question.answer && question.answer.length > 0) {
                                
                                const normalizedStudentAnswer = normalizeAnswer(studentAnswerForQuestion.firstAnswer, { toLowerCase: true });
                                
                                console.log('Essay Comparison:');
                                console.log('  Student answer (raw):', studentAnswerForQuestion.firstAnswer);
                                console.log('  Student answer (normalized):', normalizedStudentAnswer);
                                console.log('  Correct answers (raw):', question.answer);
                                
                                // Check if normalized student answer matches any normalized correct answer
                                isCorrect = question.answer.some(correctAns => {
                                    const normalizedCorrectAnswer = normalizeAnswer(correctAns, { toLowerCase: true });
                                    console.log('    Checking against:', correctAns, '→', normalizedCorrectAnswer);
                                    return normalizedCorrectAnswer === normalizedStudentAnswer;
                                });
                            } else {
                                console.log('>>> Cannot check - student answer or correct answer array missing');
                            }
                        } else if (question.typeOfAnswer === 'Graph') {
                            // Graph: Compare uploaded image URL with correctPicAnswer
                            if (studentAnswerForQuestion.stepPicture && 
                                studentAnswerForQuestion.stepPicture.secure_url && 
                                question.correctPicAnswer) {
                                
                                const normalizedStudentAnswer = normalizeAnswer(studentAnswerForQuestion.stepPicture.secure_url);
                                const normalizedCorrectAnswer = normalizeAnswer(question.correctPicAnswer);
                                
                                console.log('Graph Comparison:');
                                console.log('  Student image:', normalizedStudentAnswer);
                                console.log('  Correct image:', normalizedCorrectAnswer);
                                
                                isCorrect = normalizedCorrectAnswer === normalizedStudentAnswer;
                            }
                        }
                        
                        // Assign points based on correctness
                        console.log('>>> isCorrect:', isCorrect);
                        console.log('>>> Points to award:', isCorrect ? question.questionPoints : 0);
                        
                        if (isCorrect) {
                            studentTotalScore += question.questionPoints;
                            studentAnswerForQuestion.point = question.questionPoints;
                        } else {
                            studentAnswerForQuestion.point = 0;
                        }
                        studentAnswerForQuestion.isCorrect = isCorrect;
                        
                        console.log('>>> Running total score:', studentTotalScore);
                    } else {
                        console.log('>>> Student did NOT answer this question');
                    }
                });
            }

            findAnswer.total = studentTotalScore;

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:181',message:'Final score calculated',data:{studentTotalScore:studentTotalScore,totalSummation:totalSummation,assignmentId:assignmentID,studentId:studentID,questionsAnswered:findAnswer.questions.length,totalQuestions:assignment?.questions?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'GET_RESULT'})}).catch(()=>{});
            // #endregion

            // FIX: Don't modify attempts when getting result
            // Attempts are incremented when student OPENS the assignment (in getAssignmentDetails)
            // Not when they finish it. The old code was setting attempts = attemptsNumber,
            // which incorrectly marked the assignment as "completed" immediately after first submission

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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:233',message:'checkAssinmentAnswer - request body received',data:{reqBodyType:typeof req.body,reqBodyKeys:Object.keys(req.body || {}),hasFirstAnswer:!!req.body?.firstAnswer,hasQuestionAnswer:!!req.body?.questionAnswer,firstAnswerValue:req.body?.firstAnswer,questionAnswerValue:req.body?.questionAnswer,firstAnswerType:typeof req.body?.firstAnswer,questionAnswerType:typeof req.body?.questionAnswer},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'FORM_DATA_PARSE'})}).catch(()=>{});
        // #endregion
        
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
        // FIX: Use proper null/undefined check to handle "0" answers
        const answerToSave = (questionAnswer !== undefined && questionAnswer !== null) ? questionAnswer : firstAnswer;
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:278',message:'checkAssinmentAnswer - answerToSave determined',data:{questionAnswer:questionAnswer,firstAnswer:firstAnswer,answerToSave:answerToSave,answerToSaveType:typeof answerToSave,answerToSaveLength:answerToSave?.length,willSave:answerToSave !== undefined && answerToSave !== null && answerToSave !== ''},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ANSWER_TO_SAVE'})}).catch(()=>{});
        // #endregion
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:280',message:'Answer check result',data:{questionId:questionID,questionType:question.typeOfAnswer,answerToCheck:answerToCheck,correctAnswer:question.correctAnswer,answerArray:question.answer,isCorrect:isCorrect,points:question.questionPoints},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'CHECK_ANSWER'})}).catch(()=>{});
        // #endregion
        
        console.log('checkAssinmentAnswer - Question:', questionID);
        console.log('checkAssinmentAnswer - Answer to check:', answerToCheck);
        console.log('checkAssinmentAnswer - Correct answer:', question.correctAnswer || question.answer);
        console.log('checkAssinmentAnswer - Is correct:', isCorrect);

        if (questionIndex > -1) {
            // Update existing answer
            if (question.typeOfAnswer !== 'Graph' || !req.file) {
                // FIX: Use !== undefined and !== null to properly handle falsy values like 0 and ""
                if (answerToSave !== undefined && answerToSave !== null) {
                    findAnswer.questions[questionIndex].firstAnswer = answerToSave;
                }
                if (secondAnswer !== undefined && secondAnswer !== null) {
                    findAnswer.questions[questionIndex].secondAnswer = secondAnswer;
                }
                if (thirdAnswer !== undefined && thirdAnswer !== null) {
                    findAnswer.questions[questionIndex].thirdAnswer = thirdAnswer;
                }
                if (fourthAnswer !== undefined && fourthAnswer !== null) {
                    findAnswer.questions[questionIndex].fourthAnswer = fourthAnswer;
                }
            }
            findAnswer.questions[questionIndex].isCorrect = isCorrect;
            findAnswer.questions[questionIndex].point = isCorrect ? question.questionPoints : 0;
        } else {
            // Add new question answer
            // FIX: Only save answer if it's not undefined/null/empty to avoid marking as "not answered"
            const newQuestionAnswer = {
                question: questionID,
                firstAnswer: (answerToSave !== undefined && answerToSave !== null && answerToSave !== '') ? answerToSave : undefined,
                secondAnswer: (secondAnswer !== undefined && secondAnswer !== null && secondAnswer !== '') ? secondAnswer : undefined,
                thirdAnswer: (thirdAnswer !== undefined && thirdAnswer !== null && thirdAnswer !== '') ? thirdAnswer : undefined,
                fourthAnswer: (fourthAnswer !== undefined && fourthAnswer !== null && fourthAnswer !== '') ? fourthAnswer : undefined,
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

        // #region agent log
        const savedDoc = await answerModel.findById(findAnswer._id);
        const lastQuestionIndex = findAnswer.questions.length - 1;
        const lastQuestion = lastQuestionIndex >= 0 ? findAnswer.questions[lastQuestionIndex] : null;
        const questionIndexToCheck = questionIndex > -1 ? questionIndex : lastQuestionIndex;
        const savedQuestion = questionIndexToCheck >= 0 ? findAnswer.questions[questionIndexToCheck] : null;
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:356',message:'Answer saved - verification query',data:{answerDocId:findAnswer._id?.toString(),questionsCount:savedDoc?.questions?.length || 0,questionIndex:questionIndex,lastQuestionIndex:lastQuestionIndex,savedQuestionFirstAnswer:savedQuestion?.firstAnswer,savedQuestionFirstAnswerType:typeof savedQuestion?.firstAnswer,savedQuestionFirstAnswerLength:savedQuestion?.firstAnswer?.length,answerToSave:answerToSave,answerToSaveType:typeof answerToSave},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'SAVE_VERIFY'})}).catch(()=>{});
        // #endregion

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
        const mongoose = require('mongoose');

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:358',message:'getAssignmentAnswer called',data:{studentID:studentID,studentIDType:typeof studentID,assignmentID:assignmentID,assignmentIDType:typeof assignmentID,isValidObjectId_studentID:mongoose.Types.ObjectId.isValid(studentID),isValidObjectId_assignmentID:mongoose.Types.ObjectId.isValid(assignmentID)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'TEACHER_VIEW'})}).catch(()=>{});
        // #endregion

        console.log('=== getAssignmentAnswer START ===');
        console.log('Student ID:', studentID);
        console.log('Assignment ID:', assignmentID);

        // Find the student's answers for this assignment
        // #region agent log
        const query = { solveBy: studentID, assignment: assignmentID };
        fetch('http://127.0.0.1:7242/ingest/25a489e5-f820-4825-84a8-b9d5015821d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'answer/controller/answer.controller.js:368',message:'Query attempt - before findOne',data:{querySolveBy:query.solveBy,queryAssignment:query.assignment,querySolveByType:typeof query.solveBy,queryAssignmentType:typeof query.assignment},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'TEACHER_VIEW'})}).catch(()=>{});
        // #endregion

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
                
                // FIX: Check for undefined/null/empty string properly - empty string means "no answer"
                const hasFirstAnswer = studentAnswer.firstAnswer !== undefined && studentAnswer.firstAnswer !== null && studentAnswer.firstAnswer !== '';
                const hasSecondAnswer = studentAnswer.secondAnswer !== undefined && studentAnswer.secondAnswer !== null && studentAnswer.secondAnswer !== '';
                
                return {
                    _id: studentAnswer._id,
                    question: question?.question || '',
                    questionPic: question?.questionPic?.secure_url || null,
                    firstAnswer: studentAnswer.firstAnswer || '',
                    secondAnswer: studentAnswer.secondAnswer || '',
                    stepsPic: studentAnswer.stepPicture?.secure_url || null,
                    isCorrect: studentAnswer.isCorrect || false,
                    notAnswer: !hasFirstAnswer && !hasSecondAnswer,
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
            // FIX: Check for undefined/null instead of truthy to handle 0 points correctly
            if (q.point !== undefined && q.point !== null) {
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
                
                // FIX: Check for undefined/null/empty string properly - empty string means "no answer"
                const hasFirstAnswer = studentAnswer.firstAnswer !== undefined && studentAnswer.firstAnswer !== null && studentAnswer.firstAnswer !== '';
                const hasSecondAnswer = studentAnswer.secondAnswer !== undefined && studentAnswer.secondAnswer !== null && studentAnswer.secondAnswer !== '';
                
                return {
                    _id: studentAnswer._id,
                    question: question?.question || '',
                    questionPic: question?.questionPic?.secure_url || null,
                    firstAnswer: studentAnswer.firstAnswer || '',
                    secondAnswer: studentAnswer.secondAnswer || '',
                    stepsPic: studentAnswer.stepPicture?.secure_url || null,
                    isCorrect: studentAnswer.isCorrect || false,
                    notAnswer: !hasFirstAnswer && !hasSecondAnswer,
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