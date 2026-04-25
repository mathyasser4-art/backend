const userModel = require('../../../../DB/models/user.model')
const assignmentModel = require('../../../../DB/models/assignment.model')
const bcrypt = require('bcryptjs');

const getSupervisor = async (req, res) => {
    try {
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allSupervisor = await userModel.find({ role: "Supervisor", createdBy: schoolID }).select('userName email teacherList').populate({ path: 'teacherList', select: 'userName' })
        const countSupervisor = await userModel.countDocuments({ role: "Supervisor", createdBy: schoolID });
        if (allSupervisor.length != 0) {
            res.json({ message: "success", allSupervisor, numberOfSupervisor: countSupervisor })
        } else {
            res.json({ message: "There is no any supervisor yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addSupervisor = async (req, res) => {
    try {
        const { userName, password } = req.body
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const findSupervisor = await userModel.findOne({ userName, role: "Supervisor", createdBy: schoolID })
        if (findSupervisor) {
            res.json({ message: "This supervisor name is already registered" })
        } else {
            try {
                const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
            req.body.verify = true
            req.body.role = 'Supervisor'
            req.body.createdBy = schoolID
            const addSupervisor = new userModel(req.body)
            await addSupervisor.save()
            const allSupervisor = await userModel.find({ role: "Supervisor", createdBy: schoolID }).select('userName email teacherList').populate({ path: 'teacherList', select: 'userName' })
            const countSupervisor = await userModel.countDocuments({ role: "Supervisor", createdBy: schoolID });
            res.json({ message: "success", allSupervisor, numberOfSupervisor: countSupervisor })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateSupervisor = async (req, res) => {
    try {
        const { supervisorID } = req.params
        if (req.body.password != undefined) {
            try {
                const hashPassword = await bcrypt.hash(req.body.password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
        }
        const updateSupervisor = await userModel.findByIdAndUpdate(supervisorID, req.body)
        if (updateSupervisor) {
            const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
            const allSupervisor = await userModel.find({ role: "Supervisor", createdBy: schoolID }).select('userName email teacherList').populate({ path: 'teacherList', select: 'userName' })
            const countSupervisor = await userModel.countDocuments({ role: "Supervisor", createdBy: schoolID });
            res.json({ message: "success", allSupervisor, numberOfSupervisor: countSupervisor })
        } else {
            res.json({ message: "This supervisor is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteSupervisor = async (req, res) => {
    try {
        const { supervisorID } = req.params
        const findSupervisor = await userModel.findById(supervisorID)
        if (findSupervisor) {
            const deleteSupervisor = await userModel.findByIdAndDelete(supervisorID)
            if (deleteSupervisor) {
                const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
                const allSupervisor = await userModel.find({ role: "Supervisor", createdBy: schoolID }).select('userName email teacherList').populate({ path: 'teacherList', select: 'userName' })
                const countSupervisor = await userModel.countDocuments({ role: "Supervisor", createdBy: schoolID });
                res.json({ message: "success", allSupervisor, numberOfSupervisor: countSupervisor })
            } else {
                res.json({ message: "an error is happend" })
            }
        } else {
            res.json({ message: "This supervisor is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const supervisorDeatails = async (req, res) => {
    try {
        const supervisorID = req.userData._id
        const supervisor = await userModel.findById(supervisorID).select('userName email teacherList').populate({ path: 'teacherList', select: 'userName' })
        if (supervisor) {
            res.json({ message: "success", supervisor })
        } else {
            res.json({ message: "There is no any supervisor yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAllTeachers = async (req, res) => {
    try {
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allTeachers = await userModel.find({ role: "Teacher", createdBy: schoolID }).select('userName')
        if (allTeachers.length != 0) {
            res.json({ message: "success", allTeachers })
        } else {
            res.json({ message: "There is no any teacher yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAssignment = async (req, res) => {
    try {
        const { teacherID } = req.params
        const getAssignment = await assignmentModel.find({ createdBy: teacherID }).select('-questions').sort({ _id: -1 })
        if (getAssignment.length != 0) {
            res.json({ message: 'success', allAssignment: getAssignment })
        } else {
            res.json({ message: 'There are no assignment available now' })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addSupervisor, getSupervisor, updateSupervisor, deleteSupervisor, getAllTeachers, supervisorDeatails, getAssignment }