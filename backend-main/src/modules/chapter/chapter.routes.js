const chapterRouter = require('express').Router()
const { addChapter, getChapterQuestion, updateChapter, deleteChapter, reorderQuestions } = require('./controller/chapter.controller')

chapterRouter.post('/chapter/addChapter/:questionTypeID/:subjectID', addChapter)
chapterRouter.get('/chapter/getChapterQuestion/:chapterID', getChapterQuestion)
chapterRouter.put('/chapter/updateChapter/:chapterID', updateChapter)
chapterRouter.delete('/chapter/deleteChapter/:chapterID/:unitID', deleteChapter)
chapterRouter.put('/chapter/reorderQuestions/:chapterID', reorderQuestions)

module.exports = chapterRouter
