const checkAnswer = (questionData, questionAnswer) => {
    if (questionData.typeOfAnswer == 'Essay') {
        if (questionData.answer.includes(questionAnswer)) {
            return true
        } else {
            return false
        }
    } else if (questionData.typeOfAnswer == 'MCQ') {
        if (questionData.correctAnswer == questionAnswer) {
            return true
        } else {
            return false
        }
    } else {
        if (questionData.correctPicAnswer == questionAnswer) {
            return true
        } else {
            return false
        }
    }
}

module.exports = checkAnswer