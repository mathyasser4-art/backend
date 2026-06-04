const studentRouter = require('express').Router()
const { addStudent, getStudent, updateStudent, deleteStudent, removeStudentFromClass, search, getClass, getAssignment, getAssignmentDetails } = require('./controller/student.controller')
const { itAuth, studentAuth, itOrTeacherAuth } = require('../../middleware/auth')

studentRouter.post('/student/addStudent/:pageNumber', itOrTeacherAuth, addStudent)
studentRouter.put('/student/updateStudent/:studentID/:pageNumber', itOrTeacherAuth, updateStudent)
studentRouter.get('/student/getStudent/:pageNumber', itOrTeacherAuth, getStudent)
studentRouter.delete('/student/deleteStudent/:studentID/:pageNumber', itOrTeacherAuth, deleteStudent)
studentRouter.put('/student/removeStudentFromClass/:studentID/:classID', itOrTeacherAuth, removeStudentFromClass)
studentRouter.get('/student/search/:searchKey', itOrTeacherAuth, search)
studentRouter.get('/student/getClass', studentAuth, getClass)
studentRouter.get('/student/getAssignment/:teacherID', studentAuth, getAssignment)
studentRouter.get('/student/assignmentDetails/:assignmentID', studentAuth, getAssignmentDetails)

module.exports = studentRouter