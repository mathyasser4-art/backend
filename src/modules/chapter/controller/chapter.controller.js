const chapterModel = require('../../../../DB/models/chapter.model')
const unitModel = require('../../../../DB/models/unit.model')
const questionModel = require('../../../../DB/models/question.model')
const userModel = require('../../../../DB/models/user.model')
const jwt = require('jsonwebtoken')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const mongoose = require('mongoose')

const getChapterQuestion = async (req, res) => {
    try {
        const { chapterID } = req.params
        const { authrization } = req.headers;
        
        let userId = null;
        let userRole = null;
        
        if (authrization) {
            try {
                if (authrization.startsWith(process.env.AUTH_SECRET_KEY)) {
                    const userToken = authrization.split(process.env.AUTH_SECRET_KEY)[1]
                    const { id } = jwt.verify(userToken, process.env.TOKEN_SECRET_KEY)
                    const userFounded = await userModel.findById(id)
                    if (userFounded) {
                        userId = userFounded._id;
                        userRole = userFounded.role;
                    }
                }
            } catch (err) {
                // Ignore token error (e.g. expired or invalid), serve public questions
            }
        }

        // Determine question match condition:
        // 1. If admin, see everything
        // 2. If teacher, see global (createdBy is null/not exists) OR created by this teacher
        // 3. Otherwise (student/guest), see only global
        let matchQuery = {
            $or: [
                { createdBy: null },
                { createdBy: { $exists: false } }
            ]
        };

        if (userId) {
            if (userRole === 'Admin') {
                matchQuery = {}; // Admin sees all
            } else if (userRole === 'Teacher' || userRole === 'School' || userRole === 'IT') {
                matchQuery.$or.push({ createdBy: userId });
            }
        }

        const chapter = await chapterModel.findById(chapterID)
            .select("-unit")
            .populate({
                path: 'questions',
                match: matchQuery,
                select: 'question questionPic questionPoints answerPic answer correctAnswer wrongAnswer autoCorrect typeOfAnswer wrongPicAnswer correctPicAnswer createdBy'
            })

        if (chapter) {
            res.json({ message: "success", chapter })
        } else {
            res.json({ message: "This chapter is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addChapter = async (req, res) => {
    try {
        const addChapter = new chapterModel(req.body)
        const chapterData = await addChapter.save()
        if (chapterData) {
            const { unit } = req.body
            const { questionTypeID, subjectID } = req.params
            const questionType = new mongoose.Types.ObjectId(questionTypeID)
            const subject = new mongoose.Types.ObjectId(subjectID)
            const findUnit = await unitModel.findById(unit)
            if (findUnit) {
                findUnit.chapters.push(chapterData._id)
                await findUnit.save()
                const allUnit = await unitModel.find({ questionType, subject }).select("unitName").populate('chapters', 'chapterName')
                res.json({ message: "success", allUnit })
            }
        } else {
            res.json({ message: "an error is happened" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateChapter = async (req, res) => {
    try {
        const { chapterName } = req.body
        const { chapterID } = req.params
        const chapter = await chapterModel.findByIdAndUpdate(chapterID, { chapterName }, { new: true }).populate('questions', 'question questionPic questionPoints answerPic')
        if (chapter) {
            res.json({ message: "success", chapter })
        } else {
            res.json({ message: "This chapter is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteChapter = async (req, res) => {
    try {
        const { chapterID, unitID } = req.params
        const chapter = await chapterModel.findByIdAndDelete(chapterID)
        if (chapter) {
            chapter.questions.map(async (ID) => {
                const deleteQuestion = await questionModel.findByIdAndDelete(ID)
                if (deleteQuestion.questionPicID)
                    await cloudinary.uploader.destroy(deleteQuestion.questionPicID)
                if (deleteQuestion.answerPicID)
                    await cloudinary.uploader.destroy(deleteQuestion.answerPicID)
            })
            const unit = await unitModel.findById(unitID)
            if (unit) {
                const chapters = unit.chapters.filter(e => e != chapterID)
                await unitModel.findByIdAndUpdate(unitID, { chapters })
                res.json({ message: "success" });
            } else {
                res.json({ message: "this unit is not available" });
            }
        } else {
            res.json({ message: "This chapter is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const reorderQuestions = async (req, res) => {
    try {
        const { chapterID } = req.params
        const { questions } = req.body
        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: 'questions must be an array' })
        }
        const chapter = await chapterModel.findByIdAndUpdate(chapterID, { questions }, { new: true })
        if (chapter) {
            res.json({ message: 'success' })
        } else {
            res.json({ message: 'This chapter is not found' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addChapter, getChapterQuestion, updateChapter, deleteChapter, reorderQuestions }