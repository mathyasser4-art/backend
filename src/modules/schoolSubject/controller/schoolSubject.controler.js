const schoolSubjectModel = require('../../../../DB/models/schoolSubject.model')

const getSchoolSubject = async (req, res) => {
    try {
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const allSubject = await schoolSubjectModel.find({ school: schoolID })
        if (allSubject.length != 0) {
            res.json({ message: "success", allSubject })
        } else {
            res.json({ message: "There is no any subject yet." })
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addSchoolSubject = async (req, res) => {
    try {
        const { schoolSubjectName } = req.body
        const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
        const findSubject = await schoolSubjectModel.findOne({ schoolSubjectName, school: schoolID })
        if (findSubject) {
            res.json({ message: "This subject has been added before" })
        } else {
            req.body.school = schoolID
            const addSubject = new schoolSubjectModel(req.body)
            const subjectData = await addSubject.save()
            if (subjectData) {
                const allSubject = await schoolSubjectModel.find({ school: schoolID })
                res.json({ message: "success", allSubject })
            } else {
                res.json({ message: "an error is happend" })
            }
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateSchoolSubject = async (req, res) => {
    try {
        const { subjectID } = req.params
        const findSubject = await schoolSubjectModel.findById(subjectID)
        if (findSubject) {
            const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
            const updateSubject = await schoolSubjectModel.findByIdAndUpdate(subjectID, req.body)
            if (updateSubject) {
                const allSubject = await schoolSubjectModel.find({ school: schoolID })
                res.json({ message: "success", allSubject })
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

const removeSchoolSubject = async (req, res) => {
    try {
        const { subjectID } = req.params
        const findSubject = await schoolSubjectModel.findById(subjectID)
        if (findSubject) {
            const schoolID = req.userData.role == 'IT' ? req.userData.createdBy : req.userData._id
            const removeSubject = await schoolSubjectModel.findByIdAndRemove(subjectID)
            if (removeSubject) {
                const allSubject = await schoolSubjectModel.find({ school: schoolID })
                res.json({ message: "success", allSubject })
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

module.exports = { addSchoolSubject, updateSchoolSubject, removeSchoolSubject, getSchoolSubject }