const normalizeAnswer = require('./normalizeAnswer');

const checkAnswer = (questionData, questionAnswer) => {
    // Normalize the student's answer (convert Arabic digits, trim whitespace)
    const normalizedStudentAnswer = normalizeAnswer(questionAnswer);
    
    if (questionData.typeOfAnswer == 'Essay') {
        // For Essay questions, check against all acceptable answers
        // Use case-insensitive comparison for better flexibility
        const normalizedStudentAnswerLower = normalizedStudentAnswer.toLowerCase();
        
        // Check if any of the correct answers match (case-insensitive)
        const isCorrect = questionData.answer.some(correctAns => {
            const normalizedCorrectAnswer = normalizeAnswer(correctAns, { toLowerCase: true });
            return normalizedCorrectAnswer === normalizedStudentAnswerLower;
        });
        
        return isCorrect;
        
    } else if (questionData.typeOfAnswer == 'MCQ') {
        // For MCQ, normalize and compare
        const normalizedCorrectAnswer = normalizeAnswer(questionData.correctAnswer);
        return normalizedCorrectAnswer === normalizedStudentAnswer;
        
    } else {
        // For Graph questions (image comparison)
        // Normalize URLs/paths before comparison
        const normalizedCorrectAnswer = normalizeAnswer(questionData.correctPicAnswer);
        return normalizedCorrectAnswer === normalizedStudentAnswer;
    }
}

module.exports = checkAnswer