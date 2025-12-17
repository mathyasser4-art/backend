const questionTypeModel = require('../../../../DB/models/questionType.model')
const mongoose = require('mongoose')

const addQuestionType = async (req, res) => {
    try {
        const addTypeOfQuestion = new questionTypeModel(req.body)
        await addTypeOfQuestion.save()
        res.json({ message: "success" })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getQuestionType = async (req, res) => {
    try {
        const { typeOfExamID } = req.params
        const id = new mongoose.Types.ObjectId(typeOfExamID)
        const allQuestionType = await questionTypeModel.find({ typeOfexam: id }).select('typeOfquestion')
        if (allQuestionType.length != 0) {
            res.json({ message: "success", allQuestionType })
        } else {
            res.json({ message: "There are no question types now" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addQuestionType, getQuestionType }