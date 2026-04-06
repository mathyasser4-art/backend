const questionModel = require('../../../../DB/models/question.model')
const chapterModel = require('../../../../DB/models/chapter.model')
const cloudinaryConfig = require('../../../services/cloudinary')
const cloudinary = require("cloudinary").v2;
cloudinaryConfig()
const fs = require('fs');

const addQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { chapter, index } = req.body
        const findChapter = await chapterModel.findById(chapter)

        if (findChapter) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'questionPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                req.body.questionPic = secure_url
                req.body.questionPicID = public_id
            }
            const addQuestion = new questionModel(req.body)
            const questionData = await addQuestion.save()
            if (questionData) {
                if (index == 'last') {
                    findChapter.questions.push(questionData._id)
                } else {
                    findChapter.questions.splice(parseInt(index) + 1, 0, questionData._id);
                }
                await findChapter.save()
                res.json({ message: "success", questionData });
            } else {
                res.json({ message: "an error is happened" });
            }
        } else {
            res.json({ message: "this chapter is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const addGraphQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصور" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.files.length != 0) {
                const answerPicURL = []
                const answerPicID = []
                let correctAnswer = '';
                for (let i = 0; i < req.files.length; i++) {
                    const imageURI = req.files[i].path;
                    const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'answerPic', resource_type: "image" });
                    fs.unlinkSync(imageURI);
                    if (i == 0) {
                        correctAnswer = secure_url
                        answerPicID.push(public_id)
                    } else {
                        answerPicURL.push(secure_url)
                        answerPicID.push(public_id)
                    }
                }
                findQuestion.correctPicAnswer = correctAnswer
                findQuestion.wrongPicAnswer = answerPicURL
                findQuestion.wrongAnswerID = answerPicID
                await findQuestion.save()
                res.json({ message: "success" });
            } else {
                res.json({ message: "Upload the answer picture first" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateAnswerPic = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'answerPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                if (findQuestion.answerPic)
                    await cloudinary.uploader.destroy(findQuestion.answerPicID)
                findQuestion.answerPic = secure_url
                findQuestion.answerPicID = public_id
                await findQuestion.save()
                res.json({ message: "success" });
            } else {
                res.json({ message: "Upload the answer picture first" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateQuestion = async (req, res) => {
    try {
        if (req.validationErrorImg) {
            res.json({ message: "webp او png او jpg او jpeg يجب ان يكون امتداد الصورة" })
        }

        const { questionID } = req.params
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            if (req.file) {
                const imageURI = req.file.path;
                const { secure_url, public_id } = await cloudinary.uploader.upload(imageURI, { folder: 'questionPic', resource_type: "image" });
                fs.unlinkSync(imageURI);
                if (findQuestion.questionPicID)
                    await cloudinary.uploader.destroy(findQuestion.questionPicID)
                req.body.questionPic = secure_url
                req.body.questionPicID = public_id
                await questionModel.findByIdAndUpdate(questionID, req.body)
                res.json({ message: "success" });
            } else {
                await questionModel.findByIdAndUpdate(questionID, req.body)
                res.json({ message: "success" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const checkTheAnswer = async (req, res) => {
    try {
        const { questionID } = req.params
        const { questionAnswer } = req.body
        const getQuestion = await questionModel.findById(questionID)
        if (getQuestion) {
            if (getQuestion.typeOfAnswer == 'Essay') {
                if (getQuestion.answer.includes(questionAnswer)) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            } else if (getQuestion.typeOfAnswer == 'MCQ') {
                if (getQuestion.correctAnswer == questionAnswer) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            } else {
                if (getQuestion.correctPicAnswer == questionAnswer) {
                    res.json({ message: "success" });
                } else {
                    res.json({ message: "this answer is wrong" });
                }
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const getQuestionDetails = async (req, res) => {
    try {
        const { questionID } = req.params
        const question = await questionModel.findById(questionID)
        if (question) {
            res.json({ message: "success", question });
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const deleteQuestion = async (req, res) => {
    try {
        const { questionID, chapterID } = req.params
        const question = await questionModel.findByIdAndDelete(questionID)
        if (question) {
            if (question.questionPicID)
                await cloudinary.uploader.destroy(question.questionPicID)
            if (question.answerPicID)
                await cloudinary.uploader.destroy(question.answerPicID)
            if (question.wrongAnswerID?.length != 0) {
                const picID = question.wrongAnswerID
                for (let index = 0; index < picID.length; index++) {
                    const element = picID[index];
                    await cloudinary.uploader.destroy(element)
                }
            }
            const chapter = await chapterModel.findById(chapterID)
            if (chapter) {
                const questions = chapter.questions.filter(e => e != questionID)
                const newChapter = await chapterModel.findByIdAndUpdate(chapterID, { questions }, { new: true }).populate('questions', 'question questionPic questionPoints answerPic')
                res.json({ message: "success", chapter: newChapter });
            } else {
                res.json({ message: "this chapter is not available" });
            }
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

const updateAutoCorrect = async (req, res) => {
    try {
        const { questionID } = req.params;
        const findQuestion = await questionModel.findById(questionID)

        if (findQuestion) {
            findQuestion.autoCorrect = !findQuestion.autoCorrect;
            await findQuestion.save();
            res.json({ message: 'success', question: findQuestion });
        } else {
            res.json({ message: "this question is not available" });
        }
    } catch (error) {
        res.status(502).json({ message: error.message })
    }
}

module.exports = { addQuestion, updateAnswerPic, updateQuestion, checkTheAnswer, getQuestionDetails, deleteQuestion, addGraphQuestion, updateAutoCorrect }