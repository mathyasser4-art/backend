const organizationRouter = require('express').Router()
const {
    getOrganizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    disableOrganization,
    getOrganizationDetails,
    getOrgTeachers,
    getOrgStudents,
    getOrgClasses
} = require('./controller/organization.controller')

organizationRouter.get('/organization/getOrganizations', getOrganizations)
organizationRouter.post('/organization/addOrganization', addOrganization)
organizationRouter.put('/organization/updateOrganization/:orgID', updateOrganization)
organizationRouter.delete('/organization/deleteOrganization/:orgID', deleteOrganization)
organizationRouter.put('/organization/disableOrganization/:orgID', disableOrganization)
organizationRouter.get('/organization/getOrganizationDetails/:orgID', getOrganizationDetails)
organizationRouter.get('/organization/getOrgTeachers/:orgID', getOrgTeachers)
organizationRouter.get('/organization/getOrgStudents/:orgID', getOrgStudents)
organizationRouter.get('/organization/getOrgClasses/:orgID', getOrgClasses)

module.exports = organizationRouter
