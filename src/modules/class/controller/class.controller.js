const classModel = require('../../../../DB/models/class.model')
const userModel = require('../../../../DB/models/user.model')
const bcrypt = require('bcryptjs')

const addClass = async (req, res) => {
    try {
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        req.body.school = schoolID
        if (req.userData.role == 'Teacher') {
            req.body.teachers = [req.userData._id]
        }
        const addClassObj = new classModel(req.body)
        await addClassObj.save()

        if (req.userData.role == 'Teacher') {
            await userModel.findByIdAndUpdate(req.userData._id, { $addToSet: { classList: addClassObj._id } })
        }

        try {
            const hashPassword = await bcrypt.hash('1234', parseInt(process.env.SALTROUNDS) || 10)
            const studentData = {
                userName: addClassObj.class,
                email: `${addClassObj.class.replace(/\s+/g, '')}_${addClassObj._id}@student.com`,
                password: hashPassword,
                role: 'Student',
                class: addClassObj._id,
                verify: true,
                disable: false,
                createdBy: schoolID
            };
            if (req.userData.role === 'Teacher') {
                studentData.teacher = req.userData._id;
            } else if (req.body.teachers && req.body.teachers.length > 0) {
                studentData.teacher = req.body.teachers[0];
            }
            const newStudent = new userModel(studentData)
            await newStudent.save()
        } catch (studentErr) {
            console.error("Failed to auto-create student for class:", studentErr)
        }

        let allClasses
        if (req.userData.role == 'Teacher') {
            allClasses = await classModel.find({ school: schoolID, teachers: req.userData._id }).populate({ path: 'teachers', select: 'userName' })
        } else {
            allClasses = await classModel.find({ school: schoolID }).populate({ path: 'teachers', select: 'userName' })
        }
        res.json({ message: "success", allClasses })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getAllClass = async (req, res) => {
    try {
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        let allClasses
        if (req.userData.role == 'Teacher') {
            allClasses = await classModel.find({ school: schoolID, teachers: req.userData._id }).populate({ path: 'teachers', select: 'userName' })
        } else {
            allClasses = await classModel.find({ school: schoolID }).populate({ path: 'teachers', select: 'userName' })
        }
        res.json({ message: "success", allClasses })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateClass = async (req, res) => {
    try {
        const { classID } = req.params
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        const findClass = await classModel.findById(classID)
        if (findClass) {
            if (req.userData.role == 'Teacher' && !findClass.teachers.some(t => t.toString() === req.userData._id.toString())) {
                return res.json({ message: "You do not have access to modify this class" })
            }
            const updateClass = await classModel.findByIdAndUpdate(classID, req.body)
            if (updateClass) {
                let allClasses
                if (req.userData.role == 'Teacher') {
                    allClasses = await classModel.find({ school: schoolID, teachers: req.userData._id }).populate({ path: 'teachers', select: 'userName' })
                } else {
                    allClasses = await classModel.find({ school: schoolID }).populate({ path: 'teachers', select: 'userName' })
                }
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        const findClass = await classModel.findById(classID)
        if (findClass) {
            if (req.userData.role == 'Teacher' && !findClass.teachers.some(t => t.toString() === req.userData._id.toString())) {
                return res.json({ message: "You do not have access to remove this class" })
            }
            const removeClass = await classModel.findByIdAndDelete(classID)
            if (removeClass) {
                await userModel.updateMany({ classList: classID }, { $pull: { classList: classID } })
                await userModel.updateMany({ class: classID }, { $unset: { class: 1 } })
                let allClasses
                if (req.userData.role == 'Teacher') {
                    allClasses = await classModel.find({ school: schoolID, teachers: req.userData._id }).populate({ path: 'teachers', select: 'userName' })
                } else {
                    allClasses = await classModel.find({ school: schoolID }).populate({ path: 'teachers', select: 'userName' })
                }
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
        const schoolID = (req.userData.role == 'IT' || req.userData.role == 'Teacher') ? (req.userData.createdBy?._id || req.userData.createdBy) : req.userData._id
        const findClass = await classModel.findById(classID)
        if (findClass) {
            if (req.userData.role == 'Teacher' && !findClass.teachers.some(t => t.toString() === req.userData._id.toString())) {
                return res.json({ message: "You do not have access to view this class's students" })
            }
            const query = { createdBy: schoolID, class: classID }
            if (req.userData.role === 'Teacher') {
                query.teacher = req.userData._id
            }
            const allStudent = await userModel.find(query).select('userName')
            if (allStudent.length != 0) {
                res.json({ message: "success", allStudent })
            } else {
                res.json({ message: "There are no any student yet." })
            }
        } else {
            res.json({ message: "There is no class with this id" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addClass, getAllClass, updateClass, removeClass, getStudent }