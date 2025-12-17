const chapterRouter = require('express').Router()
const { addChapter, getChapterQuestion, updateChapter, deleteChapter } = require('./controller/chapter.controller')
const { adminAuth } = require('../../middleware/auth')

chapterRouter.post('/chapter/addChapter/:questionTypeID/:subjectID', adminAuth, addChapter)
chapterRouter.get('/chapter/getChapterQuestion/:chapterID', getChapterQuestion)
chapterRouter.put('/chapter/updateChapter/:chapterID', adminAuth, updateChapter)
chapterRouter.delete('/chapter/deleteChapter/:chapterID/:unitID', adminAuth, deleteChapter)

module.exports = chapterRouter