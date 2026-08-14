const { shuffleAndBalanceMCQ } = require('./src/services/mcqShuffle.service');

// Generate 40 test MCQ questions where all original correct answers are "C" (index 2)
const sampleQuestions = Array.from({ length: 40 }, (_, i) => ({
    _id: `q_${i + 1}`,
    question: `Question ${i + 1}`,
    typeOfAnswer: 'MCQ',
    correctAnswer: 'Correct_Ans',
    wrongAnswer: ['Option_A', 'Option_B', 'Option_D']
}));

console.log('--- Testing shuffleAndBalanceMCQ ---');
const processed = shuffleAndBalanceMCQ(sampleQuestions, { sanitize: false });

let maxStreak = 0;
let currentStreak = 1;
let lastIndex = -1;
const indexCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

processed.forEach((q, idx) => {
    const correctIdx = q.wrongAnswer.indexOf(q.correctAnswer);
    indexCounts[correctIdx] = (indexCounts[correctIdx] || 0) + 1;

    if (correctIdx === lastIndex) {
        currentStreak++;
    } else {
        currentStreak = 1;
    }
    if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
    }
    lastIndex = correctIdx;
});

console.log('Position Counts (0=A, 1=B, 2=C, 3=D):', indexCounts);
console.log('Maximum Consecutive Answer Index Streak:', maxStreak);

if (maxStreak <= 2) {
    console.log('SUCCESS: Max streak is <= 2 (No 3-in-a-row answer positions)!');
} else {
    console.error('FAILED: Found streak of', maxStreak);
    process.exit(1);
}
