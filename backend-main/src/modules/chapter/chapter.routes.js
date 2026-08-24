const chapterRouter = require('express').Router()
const { 
    addChapter, 
    getChapterQuestion, 
    updateChapter, 
    deleteChapter, 
    reorderQuestions,
    addCustomChapter,
    getCustomChapters,
    deleteCustomChapter
} = require('./controller/chapter.controller')
const { generalAuth } = require('../../middleware/auth')

chapterRouter.post('/chapter/addChapter/:questionTypeID/:subjectID', addChapter)
chapterRouter.get('/chapter/getChapterQuestion/:chapterID', getChapterQuestion)
chapterRouter.put('/chapter/updateChapter/:chapterID', updateChapter)
chapterRouter.delete('/chapter/deleteChapter/:chapterID/:unitID', deleteChapter)
chapterRouter.put('/chapter/reorderQuestions/:chapterID', reorderQuestions)

// Custom worksheets endpoints
chapterRouter.post('/chapter/custom', generalAuth, addCustomChapter)
chapterRouter.get('/chapter/custom', generalAuth, getCustomChapters)
chapterRouter.delete('/chapter/custom/:chapterID', generalAuth, deleteCustomChapter)

module.exports = chapterRouter
