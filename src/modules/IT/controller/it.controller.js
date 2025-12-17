const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs');

const getIT = async (req, res) => {
    try {
        const schoolID = req.userData._id
        const allIT = await userModel.find({ role: "IT", createdBy: schoolID }).select('userName email')
        const countIT = await userModel.countDocuments({ role: "IT", createdBy: schoolID });
        if (allIT.length != 0) {
            res.json({ message: "success", allIT, numberOfIt: countIT })
        } else {
            res.json({ message: "There is no any IT yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addIT = async (req, res) => {
    try {
        const { userName, password } = req.body
        const schoolID = req.userData._id
        const findIT = await userModel.findOne({ userName, role: "IT", createdBy: schoolID })
        if (findIT) {
            res.json({ message: "This IT name is already registered" })
        } else {
            const hashPassword = bcrypt.hashSync(password, parseInt(process.env.SALTROUNDS))
            req.body.password = hashPassword
            req.body.verify = true
            req.body.role = 'IT'
            req.body.createdBy = schoolID
            const addIT = new userModel(req.body)
            await addIT.save()
            const allIT = await userModel.find({ role: "IT", createdBy: schoolID }).select('userName email')
            const countIT = await userModel.countDocuments({ role: "IT", createdBy: schoolID });
            res.json({ message: "success", allIT, numberOfIt: countIT })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateIT = async (req, res) => {
    try {
        const { itID } = req.params
        if (req.body.password != undefined) {
            const hashPassword = bcrypt.hashSync(req.body.password, parseInt(process.env.SALTROUNDS))
            req.body.password = hashPassword
        }
        const updateIT = await userModel.findByIdAndUpdate(itID, req.body)
        if (updateIT) {
            const schoolID = req.userData._id
            const allIT = await userModel.find({ role: "IT", createdBy: schoolID }).select('userName email')
            const countIT = await userModel.countDocuments({ role: "IT", createdBy: schoolID });
            res.json({ message: "success", allIT, numberOfIt: countIT })
        } else {
            res.json({ message: "This IT is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteIT = async (req, res) => {
    try {
        const { itID } = req.params
        const findIT = await userModel.findById(itID)
        if (findIT) {
            const deleteIT = await userModel.findByIdAndDelete(itID)
            if (deleteIT) {
                const schoolID = req.userData._id
                const allIT = await userModel.find({ role: "IT", createdBy: schoolID }).select('userName email')
                const countIT = await userModel.countDocuments({ role: "IT", createdBy: schoolID });
                res.json({ message: "success", allIT, numberOfIt: countIT })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This IT is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addIT, getIT, updateIT, deleteIT }