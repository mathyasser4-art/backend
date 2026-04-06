const chapterModel = require('../../../../DB/models/chapter.model')
const unitModel = require('../../../../DB/models/unit.model')
const questionModel = require('../../../../DB/models/question.model')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const mongoose = require('mongoose')

const getChapterQuestion = async (req, res) => {
    const { chapterID } = req.params
    const chapter = await chapterModel.findById(chapterID).select("-unit").populate('questions', 'question questionPic questionPoints answerPic wrongAnswer autoCorrect typeOfAnswer wrongPicAnswer correctPicAnswer')
    if (chapter) {
        res.json({ message: "success", chapter })
    } else {
        res.json({ message: "This chapter is not found" })
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

module.exports = { addChapter, getChapterQuestion, updateChapter, deleteChapter }