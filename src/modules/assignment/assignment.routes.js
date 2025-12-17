const assignmentRouter = require('express').Router()
const { createAssignment, getAssignment, updateAssignment, deleteAssignment, getStudentResults } = require('./controller/assignment.controller')
const { teacherAuth } = require('../../middleware/auth')

assignmentRouter.post('/assignment/createAssignment', teacherAuth, createAssignment)
assignmentRouter.get('/assignment/getAssignment', teacherAuth, getAssignment)
assignmentRouter.put('/assignment/updateAssignment/:assignmentID', teacherAuth, updateAssignment)
assignmentRouter.delete('/assignment/deleteAssignment/:assignmentID', teacherAuth, deleteAssignment)
assignmentRouter.get('/assignment/:assignmentID/student-results', teacherAuth, getStudentResults);

module.exports = assignmentRouter