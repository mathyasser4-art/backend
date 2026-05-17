const assignmentRouter = require('express').Router()
const { createAssignment, getAssignment, updateAssignment, deleteAssignment, getStudentResults, duplicateAssignment, getAssignmentByClass } = require('./controller/assignment.controller')
const { teacherAuth, itAuth } = require('../../middleware/auth')

assignmentRouter.post('/assignment/createAssignment', teacherAuth, createAssignment)
assignmentRouter.get('/assignment/getAssignment', teacherAuth, getAssignment)
assignmentRouter.put('/assignment/updateAssignment/:assignmentID', teacherAuth, updateAssignment)
assignmentRouter.delete('/assignment/deleteAssignment/:assignmentID', teacherAuth, deleteAssignment)
assignmentRouter.get('/assignment/:assignmentID/student-results', teacherAuth, getStudentResults);
assignmentRouter.post('/assignment/duplicateAssignment/:assignmentID', teacherAuth, duplicateAssignment);
assignmentRouter.get('/assignment/class/:classID', itAuth, getAssignmentByClass);

module.exports = assignmentRouter