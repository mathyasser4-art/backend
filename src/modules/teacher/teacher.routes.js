const teacherRouter = require('express').Router()
const { addTeacher, getTeachers, updateTeacher, deleteTeacher, addTeacherToClass, search, getTeacherToClass, removeTeacherFromClass, getTeacherClass, getAllAssignment, getStudentHistory } = require('./controller/teacher.controller')
const { itAuth, teacherAuth } = require('../../middleware/auth')

teacherRouter.post('/teacher/addTeacher/:pageNumber', itAuth, addTeacher)
teacherRouter.put('/teacher/updateTeacher/:TeacherID/:pageNumber', itAuth, updateTeacher)
teacherRouter.get('/teacher/getTeachers/:pageNumber', itAuth, getTeachers)
teacherRouter.delete('/teacher/deleteTeacher/:TeacherID/:pageNumber', itAuth, deleteTeacher)
teacherRouter.put('/teacher/addTeacherToClass/:classID/:teacherID', itAuth, addTeacherToClass)
teacherRouter.get('/teacher/search/:searchKey', itAuth, search)
teacherRouter.get('/teacher/getTeacherToClass', itAuth, getTeacherToClass)
teacherRouter.put('/teacher/removeTeacherFromClass/:teacherID/:classID', itAuth, removeTeacherFromClass)
teacherRouter.get('/teacher/getClass', teacherAuth, getTeacherClass)
teacherRouter.get('/teacher/getAssignment', teacherAuth, getAllAssignment)
teacherRouter.get('/teacher/student/:studentID/history', teacherAuth, getStudentHistory)

module.exports = teacherRouter