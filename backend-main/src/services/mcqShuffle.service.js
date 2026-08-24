/**
 * Backend MCQ Shuffling and Answer Position Balancing Service
 * Ensures correct answers are evenly distributed across options (A, B, C, D)
 * and prevents the same correct answer index from repeating 3+ times in a row.
 */

const normalize = (val) => String(val !== undefined && val !== null ? val : "").trim();

/**
 * Shuffles questions and option choices with streak-limiting logic.
 * 
 * @param {Array} questions - Array of Mongoose question documents or plain objects.
 * @param {Object} options - Configuration options ({ sanitize: boolean })
 * @returns {Array} - Processed questions with balanced options.
 */
function shuffleAndBalanceMCQ(questions, { sanitize = false } = {}) {
    if (!Array.isArray(questions) || questions.length === 0) return questions;

    // Convert mongoose documents to plain JS objects if needed
    const processedQuestions = questions.map(q => typeof q.toObject === 'function' ? q.toObject() : { ...q });

    // ─────────────────────────────────────────────────────────────────────────
    // PASS 1: Minimize consecutive identical correct answer values (3 in a row)
    // ─────────────────────────────────────────────────────────────────────────
    let changed = true;
    let passes = 0;
    while (changed && passes < 5) {
        changed = false;
        passes++;
        for (let i = 0; i < processedQuestions.length - 2; i++) {
            const q1 = processedQuestions[i];
            const q2 = processedQuestions[i + 1];
            const q3 = processedQuestions[i + 2];

            const ans1 = q1.typeOfAnswer === 'MCQ' ? q1.correctAnswer : (q1.typeOfAnswer === 'Graph' ? q1.correctPicAnswer : (q1.answer && q1.answer[0]));
            const ans2 = q2.typeOfAnswer === 'MCQ' ? q2.correctAnswer : (q2.typeOfAnswer === 'Graph' ? q2.correctPicAnswer : (q2.answer && q2.answer[0]));
            const ans3 = q3.typeOfAnswer === 'MCQ' ? q3.correctAnswer : (q3.typeOfAnswer === 'Graph' ? q3.correctPicAnswer : (q3.answer && q3.answer[0]));

            if (ans1 && ans2 && ans3 && normalize(ans1) === normalize(ans2) && normalize(ans2) === normalize(ans3)) {
                let swapped = false;
                for (let j = i + 3; j < processedQuestions.length; j++) {
                    const qJ = processedQuestions[j];
                    const ansJ = qJ.typeOfAnswer === 'MCQ' ? qJ.correctAnswer : (qJ.typeOfAnswer === 'Graph' ? qJ.correctPicAnswer : (qJ.answer && qJ.answer[0]));
                    if (ansJ && normalize(ansJ) !== normalize(ans1)) {
                        const temp = processedQuestions[i + 2];
                        processedQuestions[i + 2] = processedQuestions[j];
                        processedQuestions[j] = temp;
                        swapped = true;
                        changed = true;
                        break;
                    }
                }
                if (!swapped) {
                    for (let j = 0; j < i; j++) {
                        const qJ = processedQuestions[j];
                        const ansJ = qJ.typeOfAnswer === 'MCQ' ? qJ.correctAnswer : (qJ.typeOfAnswer === 'Graph' ? qJ.correctPicAnswer : (qJ.answer && qJ.answer[0]));
                        if (ansJ && normalize(ansJ) !== normalize(ans1)) {
                            const temp = processedQuestions[i + 2];
                            processedQuestions[i + 2] = processedQuestions[j];
                            processedQuestions[j] = temp;
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASS 2: Shuffle option choices dynamically while preventing repeating 
    // correct option index 3 times in a row at the exact same visual position.
    // ─────────────────────────────────────────────────────────────────────────
    let lastCorrectIdx = -1;
    let secondLastCorrectIdx = -1;

    for (let i = 0; i < processedQuestions.length; i++) {
        const q = processedQuestions[i];

        if (q.typeOfAnswer === 'MCQ' && Array.isArray(q.wrongAnswer)) {
            const correctVal = normalize(q.correctAnswer || "");

            // Build unique choices including the correct answer if present
            let uniqueChoices = Array.from(new Set(q.wrongAnswer.map(normalize)));
            if (correctVal && !uniqueChoices.includes(correctVal)) {
                uniqueChoices.push(correctVal);
            }

            if (uniqueChoices.length === 0) continue;

            // Cap choices at 4
            if (correctVal && uniqueChoices.length > 4) {
                const incorrects = uniqueChoices.filter(c => c !== correctVal);
                uniqueChoices = [correctVal, ...incorrects.slice(0, 3)];
            }

            const optionsCount = uniqueChoices.length;

            if (correctVal) {
                const wrongOptions = uniqueChoices.filter(c => c !== correctVal);
                const allIndices = Array.from({ length: optionsCount }, (_, idx) => idx);
                let allowedIndices = allIndices;

                // Exclude index if it repeated 2 times already
                if (lastCorrectIdx !== -1 && secondLastCorrectIdx !== -1 && lastCorrectIdx === secondLastCorrectIdx) {
                    allowedIndices = allIndices.filter(idx => idx !== lastCorrectIdx);
                    if (allowedIndices.length === 0) allowedIndices = allIndices;
                }

                const chosenIndex = allowedIndices[Math.floor(Math.random() * allowedIndices.length)];

                const finalChoices = [];
                let wrongInserted = 0;
                for (let idx = 0; idx < optionsCount; idx++) {
                    if (idx === chosenIndex) {
                        finalChoices.push(q.correctAnswer || correctVal);
                    } else {
                        finalChoices.push(wrongOptions[wrongInserted++]);
                    }
                }

                q.wrongAnswer = finalChoices;
                secondLastCorrectIdx = lastCorrectIdx;
                lastCorrectIdx = chosenIndex;

                if (sanitize) {
                    delete q.correctAnswer;
                }
            } else {
                // If correctAnswer is not provided (student view where correctAnswer was pre-stripped)
                // Just shuffle existing choices
                q.wrongAnswer.sort(() => Math.random() - 0.5);
            }

        } else if (q.typeOfAnswer === 'Graph' && Array.isArray(q.wrongPicAnswer)) {
            const correctPic = normalize(q.correctPicAnswer || "");

            let uniquePics = Array.from(new Set(q.wrongPicAnswer.map(normalize)));
            if (correctPic && !uniquePics.includes(correctPic)) {
                uniquePics.push(correctPic);
            }

            if (uniquePics.length === 0) continue;

            if (correctPic && uniquePics.length > 4) {
                const incorrects = uniquePics.filter(c => c !== correctPic);
                uniquePics = [correctPic, ...incorrects.slice(0, 3)];
            }

            const optionsCount = uniquePics.length;

            if (correctPic) {
                const wrongPics = uniquePics.filter(c => c !== correctPic);
                const allIndices = Array.from({ length: optionsCount }, (_, idx) => idx);
                let allowedIndices = allIndices;

                if (lastCorrectIdx !== -1 && secondLastCorrectIdx !== -1 && lastCorrectIdx === secondLastCorrectIdx) {
                    allowedIndices = allIndices.filter(idx => idx !== lastCorrectIdx);
                    if (allowedIndices.length === 0) allowedIndices = allIndices;
                }

                const chosenIndex = allowedIndices[Math.floor(Math.random() * allowedIndices.length)];

                const finalChoices = [];
                let wrongInserted = 0;
                for (let idx = 0; idx < optionsCount; idx++) {
                    if (idx === chosenIndex) {
                        finalChoices.push(q.correctPicAnswer || correctPic);
                    } else {
                        finalChoices.push(wrongPics[wrongInserted++]);
                    }
                }

                q.wrongPicAnswer = finalChoices;
                secondLastCorrectIdx = lastCorrectIdx;
                lastCorrectIdx = chosenIndex;

                if (sanitize) {
                    delete q.correctPicAnswer;
                }
            } else {
                q.wrongPicAnswer.sort(() => Math.random() - 0.5);
            }
        } else if (q.typeOfAnswer === 'Essay' && sanitize) {
            delete q.answer;
        }
    }

    return processedQuestions;
}

module.exports = { shuffleAndBalanceMCQ };
