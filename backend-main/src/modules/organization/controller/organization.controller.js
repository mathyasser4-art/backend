const userModel = require('../../../../DB/models/user.model')
const classModel = require('../../../../DB/models/class.model')
const schoolSubjectModel = require('../../../../DB/models/schoolSubject.model')
const bcrypt = require('bcryptjs')

const getOrganizations = async (req, res) => {
    try {
        const allOrgs = await userModel.find({ role: 'Organization' })
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })
        res.json({ message: 'success', allOrganizations: allOrgs || [] })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addOrganization = async (req, res) => {
    try {
        const { userName, email, password, schoolsList } = req.body
        const existingOrg = await userModel.findOne({
            $or: [{ userName }, { email: email ? email.toLowerCase() : '' }]
        })
        if (existingOrg) {
            return res.json({ message: 'An organization with this name or email already exists.' })
        }

        let hashPassword
        try {
            hashPassword = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS) || 10)
        } catch (err) {
            return res.status(500).json({ message: 'Error hashing password' })
        }

        const validSchools = Array.isArray(schoolsList) ? schoolsList : []

        const newOrg = new userModel({
            userName,
            email: email ? email.toLowerCase() : `${userName.replace(/\s+/g, '').toLowerCase()}@org.com`,
            password: hashPassword,
            role: 'Organization',
            verify: true,
            disable: false,
            schoolsList: validSchools
        })
        await newOrg.save()

        // Link schools to this organization
        if (validSchools.length > 0) {
            await userModel.updateMany(
                { _id: { $in: validSchools } },
                { $set: { organization: newOrg._id } }
            )
        }

        const allOrgs = await userModel.find({ role: 'Organization' })
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })

        res.json({ message: 'success', allOrganizations: allOrgs })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateOrganization = async (req, res) => {
    try {
        const { orgID } = req.params
        const { userName, email, password, schoolsList } = req.body

        const targetOrg = await userModel.findById(orgID)
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const updateData = {}
        if (userName) updateData.userName = userName
        if (email) updateData.email = email.toLowerCase()
        if (password) {
            try {
                updateData.password = await bcrypt.hash(password, parseInt(process.env.SALTROUNDS) || 10)
            } catch (err) {
                return res.status(500).json({ message: 'Error hashing password' })
            }
        }

        if (Array.isArray(schoolsList)) {
            updateData.schoolsList = schoolsList

            // Remove organization link from previously assigned schools not in new list
            await userModel.updateMany(
                { organization: orgID, _id: { $nin: schoolsList } },
                { $unset: { organization: 1 } }
            )

            // Add organization link to newly assigned schools
            if (schoolsList.length > 0) {
                await userModel.updateMany(
                    { _id: { $in: schoolsList } },
                    { $set: { organization: orgID } }
                )
            }
        }

        await userModel.findByIdAndUpdate(orgID, updateData)

        const allOrgs = await userModel.find({ role: 'Organization' })
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })

        res.json({ message: 'success', allOrganizations: allOrgs })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteOrganization = async (req, res) => {
    try {
        const { orgID } = req.params
        const targetOrg = await userModel.findById(orgID)
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        // Unlink schools
        await userModel.updateMany(
            { organization: orgID },
            { $unset: { organization: 1 } }
        )

        await userModel.findByIdAndDelete(orgID)

        const allOrgs = await userModel.find({ role: 'Organization' })
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })

        res.json({ message: 'success', allOrganizations: allOrgs })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const disableOrganization = async (req, res) => {
    try {
        const { orgID } = req.params
        const targetOrg = await userModel.findById(orgID)
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const newDisableState = !targetOrg.disable
        await userModel.findByIdAndUpdate(orgID, { disable: newDisableState })

        const allOrgs = await userModel.find({ role: 'Organization' })
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })

        res.json({ message: 'success', allOrganizations: allOrgs })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getOrganizationDetails = async (req, res) => {
    try {
        const { orgID } = req.params
        const targetOrg = await userModel.findById(orgID)
            .select('userName email disable schoolsList')
            .populate({ path: 'schoolsList', select: 'userName email disable' })

        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const schoolIDs = (targetOrg.schoolsList || []).map(s => s._id || s)

        // Get breakdown per school
        const schoolsBreakdown = await Promise.all(schoolIDs.map(async (schoolId) => {
            const schoolDoc = await userModel.findById(schoolId).select('userName email disable')
            if (!schoolDoc) return null

            const teacherCount = await userModel.countDocuments({ role: 'Teacher', createdBy: schoolId })
            const studentCount = await userModel.countDocuments({ role: 'Student', createdBy: schoolId })
            const classCount = await classModel.countDocuments({ school: schoolId })

            return {
                _id: schoolDoc._id,
                userName: schoolDoc.userName,
                email: schoolDoc.email,
                disable: schoolDoc.disable,
                teachersCount: teacherCount,
                studentsCount: studentCount,
                classesCount: classCount
            }
        }))

        const validSchools = schoolsBreakdown.filter(Boolean)

        const totalTeachers = validSchools.reduce((sum, s) => sum + s.teachersCount, 0)
        const totalStudents = validSchools.reduce((sum, s) => sum + s.studentsCount, 0)
        const totalClasses = validSchools.reduce((sum, s) => sum + s.classesCount, 0)

        res.json({
            message: 'success',
            organization: targetOrg,
            stats: {
                totalSchools: validSchools.length,
                totalTeachers,
                totalStudents,
                totalClasses
            },
            schools: validSchools
        })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getOrgTeachers = async (req, res) => {
    try {
        const { orgID } = req.params
        const { schoolID } = req.query
        const targetOrg = await userModel.findById(orgID).select('schoolsList')
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const allSchoolIDs = (targetOrg.schoolsList || []).map(s => s.toString())
        const targetSchoolIDs = schoolID && allSchoolIDs.includes(schoolID)
            ? [schoolID]
            : allSchoolIDs

        const teachers = await userModel.find({
            role: 'Teacher',
            createdBy: { $in: targetSchoolIDs }
        })
            .select('userName email subject classList maxStudents createdBy disable')
            .populate([
                { path: 'classList', select: 'class' },
                { path: 'subject', select: 'schoolSubjectName' },
                { path: 'createdBy', select: 'userName' }
            ])

        res.json({ message: 'success', teachers })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getOrgStudents = async (req, res) => {
    try {
        const { orgID } = req.params
        const { schoolID } = req.query
        const targetOrg = await userModel.findById(orgID).select('schoolsList')
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const allSchoolIDs = (targetOrg.schoolsList || []).map(s => s.toString())
        const targetSchoolIDs = schoolID && allSchoolIDs.includes(schoolID)
            ? [schoolID]
            : allSchoolIDs

        const students = await userModel.find({
            role: 'Student',
            createdBy: { $in: targetSchoolIDs }
        })
            .select('userName email class teacher createdBy coins disable')
            .populate([
                { path: 'class', select: 'class' },
                { path: 'teacher', select: 'userName' },
                { path: 'createdBy', select: 'userName' }
            ])

        res.json({ message: 'success', students })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getOrgClasses = async (req, res) => {
    try {
        const { orgID } = req.params
        const { schoolID } = req.query
        const targetOrg = await userModel.findById(orgID).select('schoolsList')
        if (!targetOrg) {
            return res.json({ message: 'Organization not found' })
        }

        const allSchoolIDs = (targetOrg.schoolsList || []).map(s => s.toString())
        const targetSchoolIDs = schoolID && allSchoolIDs.includes(schoolID)
            ? [schoolID]
            : allSchoolIDs

        const classes = await classModel.find({
            school: { $in: targetSchoolIDs }
        })
            .populate([
                { path: 'school', select: 'userName' },
                { path: 'teachers', select: 'userName' }
            ])

        res.json({ message: 'success', classes })
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = {
    getOrganizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    disableOrganization,
    getOrganizationDetails,
    getOrgTeachers,
    getOrgStudents,
    getOrgClasses
}
