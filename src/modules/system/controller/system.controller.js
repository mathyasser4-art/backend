const systemModel = require('../../../../DB/models/system.model')
const unitModel = require('../../../../DB/models/unit.model')

const addSystem = async (req, res) => {
    try {
        const addSystem = new systemModel(req.body)
        await addSystem.save()
        const allSystem = await systemModel.find().populate('subjects')
        res.json({ message: "success", allSystem })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAllSystem = async (req, res) => {
    try {
        const { questionTypeID } = req.params
        let query = {}
        
        // If questionTypeID is provided, filter by it
        if (questionTypeID) {
            query.questionTypeID = questionTypeID
        }
        
        const allSystem = await systemModel.find(query).populate('subjects').lean()
        if (allSystem.length != 0) {
            // Compute question count for each subject in each system
            for (let sys of allSystem) {
                const qTypeID = questionTypeID || sys.questionTypeID;
                if (sys.subjects) {
                    for (let sub of sys.subjects) {
                        if (qTypeID) {
                            const units = await unitModel.find({ subject: sub._id, questionType: qTypeID }).populate('chapters', 'questions');
                            let totalQuestions = 0;
                            for (const u of units) {
                                if (u.chapters) {
                                    for (const ch of u.chapters) {
                                        totalQuestions += ch.questions ? ch.questions.length : 0;
                                    }
                                }
                            }
                            sub.hasQuestions = totalQuestions > 0;
                        } else {
                            sub.hasQuestions = false;
                        }
                    }
                }
            }
            res.json({ message: "success", allSystem })
        } else {
            res.json({ message: "There are no system now." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateSystem = async (req, res) => {
    try {
        const { systemID } = req.params
        const updateSystem = await systemModel.findByIdAndUpdate(systemID, req.body)
        if (updateSystem) {
            const allSystem = await systemModel.find().populate('subjects')
            res.json({ message: "success", allSystem })
        } else {
            res.json({ message: "an error is happend." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addSystem, getAllSystem, updateSystem }