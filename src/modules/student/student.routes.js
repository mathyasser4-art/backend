const studentRouter = require('express').Router()
const { addStudent, getStudent, updateStudent, deleteStudent, removeStudentFromClass, search, getClass, getAssignment, getAssignmentDetails } = require('./controller/student.controller')
const { itAuth, studentAuth } = require('../../middleware/auth')

studentRouter.post('/student/addStudent/:pageNumber', itAuth, addStudent)
studentRouter.put('/student/updateStudent/:studentID/:pageNumber', itAuth, updateStudent)
studentRouter.get('/student/getStudent/:pageNumber', itAuth, getStudent)
studentRouter.delete('/student/deleteStudent/:studentID/:pageNumber', itAuth, deleteStudent)
studentRouter.put('/student/removeStudentFromClass/:studentID/:classID', itAuth, removeStudentFromClass)
studentRouter.get('/student/search/:searchKey', itAuth, search)
studentRouter.get('/student/getClass', studentAuth, getClass)
studentRouter.get('/student/getAssignment/:teacherID', studentAuth, getAssignment)
studentRouter.get('/student/assignmentDetails/:assignmentID', studentAuth, getAssignmentDetails)

module.exports = studentRouter