const systemModel = require('../../../../DB/models/system.model')

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
        
        const allSystem = await systemModel.find(query).populate('subjects')
        if (allSystem.length != 0) {
            res.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
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

const deleteSystem = async (req, res) => {
    try {
        const { systemID } = req.params
        const findSystem = await systemModel.findByIdAndDelete(systemID)
        if (findSystem) {
            const allSystem = await systemModel.find().populate('subjects')
            res.json({ message: "success", allSystem })
        } else {
            res.json({ message: "There is no system with this id." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addSystem, getAllSystem, updateSystem, deleteSystem }