const subjectModel = require('../../../../DB/models/subject.model')
const systemModel = require('../../../../DB/models/system.model')

const addSubject = async (req, res) => {
    try {
        const { system } = req.body
        const findSystem = await systemModel.findById(system)
        if (findSystem) {
            const addSubject = new subjectModel(req.body)
            const subjectData = await addSubject.save()
            if (subjectData) {
                findSystem.subjects.push(subjectData._id)
                await findSystem.save()
                const allSystem = await systemModel.find().populate('subjects')
                res.json({ message: "success", allSystem })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This system id is wrong" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateSubject = async (req, res) => {
    try {
        const { subjectID } = req.params
        const findSubject = await subjectModel.findById(subjectID)
        if (findSubject) {
            const updateSubject = await subjectModel.findByIdAndUpdate(subjectID, req.body)
            if (updateSubject) {
                const allSystem = await systemModel.find().populate('subjects')
                res.json({ message: "success", allSystem })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "There is no subject with this id" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addSubject, updateSubject }