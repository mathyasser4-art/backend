const questionModel = require('../../../../DB/models/question.model')
const chapterModel = require('../../../../DB/models/chapter.model')
const userModel = require('../../../../DB/models/user.model')
const questionReportModel = require('../../../../DB/models/questionReport.model')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const fs = require('fs');

const addQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { chapter, index } = req.body
        const findChapter = await chapterModel.findById(chapter)

        if (findChapter) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'questionPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                req.body.questionPic = secure_url
                req.body.questionPicID = public_id
            }
            const addQuestion = new questionModel(req.body)
            const questionData = await addQuestion.save()
            if (questionData) {
                if (index == 'last') {
                    findChapter.questions.push(questionData._id)
                } else {
                    findChapter.questions.splice(parseInt(index) + 1, 0, questionData._id);
                }
                await findChapter.save()
                res.json({ message: "success", questionData });
            } else {
                res.json({ message: "an error is happened" });
            }
        } else {
            res.json({ message: "this chapter is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addGraphQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصور" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.files.length != 0) {
                const answerPicURL = []
                const answerPicID = []
                let correctAnswer = '';
                for (let i = 0; i < req.files.length; i++) {
                    const imageURI = req.files[i].path;
                    const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'answerPic', resource_type: "image" });
                    fs.unlinkSync(imageURI);
                    if (i == 0) {
                        correctAnswer = secure_url
                        answerPicID.push(public_id)
                    } else {
                        answerPicURL.push(secure_url)
                        answerPicID.push(public_id)
                    }
                }
                findQuestion.correctPicAnswer = correctAnswer
                findQuestion.wrongPicAnswer = answerPicURL
                findQuestion.wrongAnswerID = answerPicID
                await findQuestion.save()
                res.json({ message: "success" });
            } else {
                res.json({ message: "Upload the answer picture first" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateAnswerPic = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'answerPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                if (findQuestion.answerPic)
                    await cloudinary.uploader.destroy(findQuestion.answerPicID)
                findQuestion.answerPic = secure_url
                findQuestion.answerPicID = public_id
                await findQuestion.save()
                res.json({ message: "success" });
            } else {
                res.json({ message: "Upload the answer picture first" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'questionPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                if (findQuestion.questionPicID)
                    await cloudinary.uploader.destroy(findQuestion.questionPicID)
                req.body.questionPic = secure_url
                req.body.questionPicID = public_id
                await questionModel.findByIdAndUpdate(questionID, req.body)
                res.json({ message: "success" });
            } else {
                await questionModel.findByIdAndUpdate(questionID, req.body)
                res.json({ message: "success" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

// Normalise Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩) → Western (0–9) so both
// keyboard modes are accepted for essay / numeric answers.
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const normalizeDigits = (str) => {
    if (!str) return str
    return String(str)
        .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => ARABIC_DIGITS.indexOf(d).toString())
        .trim()
}

const checkTheAnswer = async (req, res) => {
    try {
        const { questionID } = req.params
        const { questionAnswer } = req.body
        const normalizedAnswer = normalizeDigits(questionAnswer)
        const getQuestion = await questionModel.findById(questionID)
        if (getQuestion) {
            if (getQuestion.typeOfAnswer == 'Essay') {
                if (getQuestion.answer.map(normalizeDigits).includes(normalizedAnswer)) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            } else if (getQuestion.typeOfAnswer == 'MCQ') {
                if (normalizeDigits(getQuestion.correctAnswer) == normalizedAnswer) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            } else {
                if (getQuestion.correctPicAnswer == questionAnswer) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getQuestionDetails = async (req, res) => {
    try {
        const { questionID } = req.params
        const question = await questionModel.findById(questionID)
        if (question) {
            res.set('Cache-Control', 'public, max-age=10, s-maxage=60, stale-while-revalidate=30');
            res.json({ message: "success", question });
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteQuestion = async (req, res) => {
    try {
        const { questionID, chapterID } = req.params
        const question = await questionModel.findByIdAndDelete(questionID)
        if (question) {
            if (question.questionPicID)
                await cloudinary.uploader.destroy(question.questionPicID)
            if (question.answerPicID)
                await cloudinary.uploader.destroy(question.answerPicID)
            if (question.wrongAnswerID?.length != 0) {
                const picID = question.wrongAnswerID
                for (let index = 0; index < picID.length; index++) {
                    const element = picID[index];
                    await cloudinary.uploader.destroy(element)
                }
            }
            const chapter = await chapterModel.findById(chapterID)
            if (chapter) {
                const questions = chapter.questions.filter(e => e != questionID)
                const newChapter = await chapterModel.findByIdAndUpdate(chapterID, { questions }, { new: true }).populate('questions', 'question questionPic questionPoints answerPic')
                res.json({ message: "success", chapter: newChapter });
            } else {
                res.json({ message: "this chapter is not available" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateAutoCorrect = async (req, res) => {
    try {
        const { questionID } = req.params;
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            findQuestion.autoCorrect = !findQuestion.autoCorrect;
            await findQuestion.save();
            res.json({ message: 'success', question: findQuestion });
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}
const getQuestionsByLevel = async (req, res) => {
    try {
        const { level } = req.params;
        const levelNum = Number(level);
        
        if (isNaN(levelNum) || ![0, 1, 2, 3].includes(levelNum)) {
            return res.json({ message: "invalid level, must be 0, 1, 2, or 3" });
        }

        const questions = await questionModel.find({ level: levelNum });
        if (questions && questions.length > 0) {
            res.set('Cache-Control', 'public, max-age=10, s-maxage=60, stale-while-revalidate=30');
            res.json({ message: "success", questions });
        } else {
            // Fallback: fetch random questions from the entire database
            const randomQuestions = await questionModel.aggregate([{ $sample: { size: 50 } }]);
            if (randomQuestions && randomQuestions.length > 0) {
                res.set('Cache-Control', 'public, max-age=5, s-maxage=10');
                res.json({ message: "success", questions: randomQuestions });
            } else {
                res.json({ message: "no questions found in the database" });
            }
        }
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
}

// ── Math evaluator utility for auto-correction ───────────────────────────────
function evaluateMath(expression) {
    if (!expression || typeof expression !== 'string') return null;

    let cleaned = expression
        .replace(/×/g, '*')
        .replace(/x/gi, '*')
        .replace(/÷/g, '/')
        .replace(/=\s*\?/g, '')
        .replace(/=\s*/g, '');

    let parts = cleaned.trim().split(/\s+/);
    let reconstructed = '';
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i > 0) {
            const prevPart = parts[i - 1];
            const startsWithDigitOrDot = /^[0-9.]/.test(part);
            const prevEndsWithOperator = /[+\-*/(]$/.test(prevPart);
            
            if (startsWithDigitOrDot && !prevEndsWithOperator) {
                reconstructed += '+';
            }
        }
        reconstructed += part;
    }

    const isStrictArithmetic = /^[0-9+\-*/().]+$/.test(reconstructed);
    if (!isStrictArithmetic) {
        return null;
    }

    try {
        const result = Function(`"use strict"; return (${reconstructed})`)();
        return typeof result === 'number' && !isNaN(result) ? Math.round(result * 10000) / 10000 : null;
    } catch (err) {
        return null;
    }
}

// ── 1. Toggle reporting a question error (Teacher Only) ──────────────────────
const reportQuestionError = async (req, res) => {
    try {
        const teacherID = req.userData._id;
        const { questionID, issueType, teacherComment } = req.body;

        if (!questionID) {
            return res.status(400).json({ message: "Question ID is required" });
        }

        // Retrieve teacher's governing School ID
        const teacherUser = await userModel.findById(teacherID).select('createdBy');
        if (!teacherUser) {
            return res.status(404).json({ message: "Teacher account not found" });
        }

        const schoolID = teacherUser.createdBy || teacherID; // Fallback to teacherID if orphan

        // Check if report already exists (Toggle behavior)
        const existing = await questionReportModel.findOne({ question: questionID, reportedBy: teacherID });
        if (existing) {
            await questionReportModel.findByIdAndDelete(existing._id);
            return res.json({ message: "success", status: "unreported" });
        }

        // Save new report
        const report = new questionReportModel({
            question: questionID,
            reportedBy: teacherID,
            school: schoolID,
            issueType: issueType || 'answer',
            teacherComment: teacherComment || ''
        });

        await report.save();
        res.json({ message: "success", status: "reported", report });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// ── 2. Get reported questions for the logged-in School Account ────────────────
const getSchoolQuestionReports = async (req, res) => {
    try {
        const schoolID = req.userData._id;

        const reports = await questionReportModel.find({ school: schoolID })
            .populate({
                path: 'question',
                populate: {
                    path: 'chapter',
                    populate: {
                        path: 'unit',
                        populate: {
                            path: 'subject'
                        }
                    }
                }
            })
            .populate('reportedBy', 'userName email')
            .sort({ _id: -1 });

        res.json({ message: "success", reports });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

// ── 3. Resolve a reported question (School Account Only: Auto-Correct / Dismiss) 
const resolveQuestionReport = async (req, res) => {
    try {
        const { reportID } = req.params;
        const { action } = req.body; // 'correct' or 'dismiss'

        const report = await questionReportModel.findById(reportID).populate('question');
        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        if (action === 'correct') {
            const questionDoc = report.question;
            if (!questionDoc) {
                return res.status(404).json({ message: "Question document not found" });
            }

            // Mathematically evaluate correct solution
            const correctValue = evaluateMath(questionDoc.question);
            if (correctValue !== null) {
                if (questionDoc.typeOfAnswer === 'Essay') {
                    questionDoc.answer = [String(correctValue)];
                } else if (questionDoc.typeOfAnswer === 'MCQ') {
                    questionDoc.correctAnswer = String(correctValue);
                }
                await questionDoc.save();
            } else {
                return res.status(400).json({ message: "This question cannot be auto-corrected (non-mathematical content)" });
            }
        }

        // Successfully resolved/dismissed, remove report from database
        await questionReportModel.findByIdAndDelete(reportID);
        res.json({ message: "success" });
    } catch (error) {
        res.status(502).json({ message: error.message });
    }
};

module.exports = { 
    addQuestion, 
    updateAnswerPic, 
    updateQuestion, 
    checkTheAnswer, 
    getQuestionDetails, 
    deleteQuestion, 
    addGraphQuestion, 
    updateAutoCorrect, 
    getQuestionsByLevel,
    reportQuestionError,
    getSchoolQuestionReports,
    resolveQuestionReport
}