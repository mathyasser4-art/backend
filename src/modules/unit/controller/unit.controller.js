const unitModel = require('../../../../DB/models/unit.model')
const mongoose = require('mongoose')

const addUnit = async (req, res) => {
    try {
        let { questionType, subject } = req.body
        const addUnit = new unitModel(req.body)
        await addUnit.save()
        questionType = new mongoose.Types.ObjectId(questionType)
        subject = new mongoose.Types.ObjectId(subject)
        const allUnit = await unitModel.find({ questionType, subject }).select("unitName").populate('chapters', 'chapterName')
        res.json({ message: "success", allUnit })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getUnit = async (req, res) => {
    try {
        const { questionTypeID, subjectID } = req.params
        const questionType = new mongoose.Types.ObjectId(questionTypeID)
        const subject = new mongoose.Types.ObjectId(subjectID)
        const allUnit = await unitModel.find({ questionType, subject }).select("unitName").populate('chapters', 'chapterName')
        if (allUnit.length != 0) {
            res.json({ message: "success", allUnit })
        } else {
            res.json({ message: "There are no unit now" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateUnit = async (req, res) => {
    try {
        const { questionTypeID, unitID, subjectID } = req.params
        const { unitName } = req.body
        const updateUnit = await unitModel.findByIdAndUpdate(unitID, { unitName })
        if (updateUnit) {
            const subject = new mongoose.Types.ObjectId(subjectID)
            const questionType = new mongoose.Types.ObjectId(questionTypeID)
            const allUnit = await unitModel.find({ questionType, subject }).select("unitName").populate('chapters', 'chapterName')
            res.json({ message: "success", allUnit })
        } else {
            res.json({ message: "An Error is happend Faild to update" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteUnit = async (req, res) => {
    try {
        const { questionTypeID, unitID, subjectID } = req.params
        const findUnit = await unitModel.findById(unitID)
        if (findUnit) {
            if (findUnit.chapters.length == 0) {
                await unitModel.findByIdAndDelete(unitID)
                const subject = new mongoose.Types.ObjectId(subjectID)
                const questionType = new mongoose.Types.ObjectId(questionTypeID)
                const allUnit = await unitModel.find({ questionType, subject }).select("unitName").populate('chapters', 'chapterName')
                res.json({ message: "success", allUnit })
            } else {
                res.json({ message: "To be able to delete this item package, you must first delete its items." })
            }
        } else {
            res.json({ message: "This unit is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addUnit, getUnit, updateUnit, deleteUnit }