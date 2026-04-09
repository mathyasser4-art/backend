const chapterRouter = require('express').Router()
const { addChapter, getChapterQuestion, updateChapter, deleteChapter } = require('./controller/chapter.controller')

chapterRouter.post('/chapter/addChapter/:questionTypeID/:subjectID', addChapter)
chapterRouter.get('/chapter/getChapterQuestion/:chapterID', getChapterQuestion)
chapterRouter.put('/chapter/updateChapter/:chapterID', updateChapter)
chapterRouter.delete('/chapter/deleteChapter/:chapterID/:unitID', deleteChapter)

module.exports = chapterRouter
