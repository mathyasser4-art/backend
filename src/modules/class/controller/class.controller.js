const classModel = require('../../../../DB/models/class.model')
const userModel = require('../../../../DB/models/user.model')

const addClass = async (req, res) => {
    try {
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        req.body.school = schoolID
        const addClass = new classModel(req.body)
        await addClass.save()
        const allClasses = await classModel.find({ school: schoolID })
        res.json({ message: "success", allClasses })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAllClass = async (req, res) => {
    try {
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allClasses = await classModel.find({ school: schoolID }).populate({ path: 'teachers', select: 'userName' })
        if (allClasses.length != 0) {
            res.json({ message: "success", allClasses })
        } else {
            res.json({ message: "There are no any classes now" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateClass = async (req, res) => {
    try {
        const { classID } = req.params
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const findClass = await classModel.findById(classID)
        if (findClass) {
            const updateClass = await classModel.findByIdAndUpdate(classID, req.body)
            if (updateClass) {
                const allClasses = await classModel.find({ school: schoolID })
                res.json({ message: "success", allClasses })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "There is no class with this id" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const removeClass = async (req, res) => {
    try {
        const { classID } = req.params
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const findClass = await classModel.findById(classID)
        if (findClass) {
            // await userModel.deleteMany({class: findClass._id})
            const removeClass = await classModel.findByIdAndDelete(classID)
            if (removeClass) {
                const allClasses = await classModel.find({ school: schoolID })
                res.json({ message: "success", allClasses })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "There is no class with this id" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getStudent = async (req, res) => {
    try {
        const { classID } = req.params
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allStudent = await userModel.find({ createdBy: schoolID, class: classID }).select('userName')
        if (allStudent.length != 0) {
            res.json({ message: "success", allStudent })
        } else {
            res.json({ message: "There are no any student yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addClass, getAllClass, updateClass, removeClass, getStudent }