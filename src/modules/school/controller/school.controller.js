const userModel = require('../../../../DB/models/user.model')
const classModel = require('../../../../DB/models/class.model')
const schoolSubjectModel = require('../../../../DB/models/schoolSubject.model')
const bcrypt = require('bcryptjs');

const getSchool = async (req, res) => {
    const allSchools = await userModel.find({ role: "School" }).select('userName email disable')
    if (allSchools.length != 0) {
        res.json({ message: "success", allSchools })
    } else {
        res.json({ message: "There is no any school yet." })
    }
}

const addSchool = async (req, res) => {
    try {
        const { userName, password } = req.body
        const findSchool = await userModel.findOne({ userName })
        if (findSchool) {
            res.json({ message: "This school name is already registered" })
        } else {
            try {
                const hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
            req.body.verify = true
            req.body.role = 'School'
            const addSchool = new userModel(req.body)
            await addSchool.save()
            const allSchools = await userModel.find({ role: "School" }).select('userName email disable')
            res.json({ message: "success", allSchools })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateSchool = async (req, res) => {
    try {
        const { schoolID } = req.params
        if (req.body.password != undefined) {
            try {
                const hashPassword = await bcrypt.hash(req.body.password, parseInt(process.env.SALTROUNDS))
                req.body.password = hashPassword
            } catch (bcryptError) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
        }
        const updateSchool = await userModel.findByIdAndUpdate(schoolID, req.body)
        if (updateSchool) {
            const allSchools = await userModel.find({ role: "School" }).select('userName email disable')
            res.json({ message: "success", allSchools })
        } else {
            res.json({ message: "This school is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteSchool = async (req, res) => {
    try {
        const { schoolID } = req.params
        const findSchool = await userModel.findById(schoolID)
        if (findSchool) {
            const findEmployee = await userModel.find({ createdBy: schoolID })
            if (findEmployee.length != 0) {
                res.json({ message: "There are many people linked to this account, such as teachers, students and it, so delete their accounts first." })
            } else {
                const findClasses = await classModel.find({ school: schoolID })
                if (findClasses.length != 0) {
                    res.json({ message: "There are many classes linked to this account, so delete this classes first." })
                } else {
                    const findSubjects = await schoolSubjectModel.find({ school: schoolID })
                    if (findSubjects.length != 0) {
                        res.json({ message: "There are many subjects linked to this account, so delete this subjects first." })
                    } else {
                        await userModel.findByIdAndDelete(schoolID)
                        const allSchools = await userModel.find({ role: "School" }).select('userName email disable')
                        res.json({ message: "success", allSchools })
                    }
                }
            }
        } else {
            res.json({ message: "This school is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const disableSchool = async (req, res) => {
    try {
        const { schoolID } = req.params
        const findSchool = await userModel.findById(schoolID)
        if (findSchool) {
            if (findSchool.disable) {
                await userModel.findByIdAndUpdate(schoolID, { disable: false })
                await userModel.updateMany({ createdBy: schoolID }, { disable: false })
            } else {
                await userModel.findByIdAndUpdate(schoolID, { disable: true })
                await userModel.updateMany({ createdBy: schoolID }, { disable: true })
            }
            const allSchools = await userModel.find({ role: "School" }).select('userName email disable')
            res.json({ message: "success", allSchools })
        } else {
            res.json({ message: "This school is not found" })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addSchool, getSchool, updateSchool, deleteSchool, disableSchool }