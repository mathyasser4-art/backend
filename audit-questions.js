const mongoose = require('mongoose');
require('dotenv').config();

const questionModel = require('./DB/models/question.model');
const chapterModel = require('./DB/models/chapter.model');
const subjectModel = require('./DB/models/subject.model');

async function auditQuestions() {
    console.log('='.repeat(60));
    console.log('🔍 QUESTION AUDIT - Checking for Invalid Answers');
    console.log('='.repeat(60));
    console.log('');

    try {
        await mongoose.connect(process.env.ONLINE_CONNECTION_DB, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ Connected to database:', mongoose.connection.name);
        console.log('');

        const questions = await questionModel.find()
            .populate({
                path: 'chapter',
                populate: { path: 'subject' }
            })
            .lean();

        console.log(`📊 Total Questions Found: ${questions.length}`);
        console.log('');
        console.log('='.repeat(60));
        console.log('🚨 ISSUES FOUND:');
        console.log('='.repeat(60));
        console.log('');

        let issueCount = 0;
        const issues = [];

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const questionIssues = [];
            
            // Check Essay type questions
            if (q.typeOfAnswer === 'Essay') {
                if (!q.answer || q.answer.length === 0) {
                    questionIssues.push('❌ Missing correct answer (answer array is empty)');
                }
                if (q.correctAnswer) {
                    questionIssues.push('⚠️  Has correctAnswer field but should only use answer array');
                }
                if (q.answer && q.answer.length > 0) {
                    q.answer.forEach((ans, idx) => {
                        if (!ans || ans.trim() === '') {
                            questionIssues.push(`❌ Answer ${idx + 1} is empty or whitespace only`);
                        }
                    });
                }
            }
            
            // Check MCQ type questions
            if (q.typeOfAnswer === 'MCQ') {
                if (!q.correctAnswer || q.correctAnswer.trim() === '') {
                    questionIssues.push('❌ Missing correct answer (correctAnswer field is empty)');
                }
                if (!q.wrongAnswer || q.wrongAnswer.length === 0) {
                    questionIssues.push('⚠️  No wrong answer options provided');
                }
                if (q.wrongAnswer && q.correctAnswer) {
                    if (q.wrongAnswer.includes(q.correctAnswer)) {
                        questionIssues.push('🔴 CRITICAL: Correct answer is also in wrong answers array!');
                    }
                }
            }
            
            // Check Graph type questions
            if (q.typeOfAnswer === 'Graph') {
                if (!q.correctPicAnswer || q.correctPicAnswer.trim() === '') {
                    questionIssues.push('❌ Missing correct picture answer');
                }
                if (!q.wrongPicAnswer || q.wrongPicAnswer.length === 0) {
                    questionIssues.push('⚠️  No wrong picture options provided');
                }
                if (q.wrongPicAnswer && q.correctPicAnswer) {
                    if (q.wrongPicAnswer.includes(q.correctPicAnswer)) {
                        questionIssues.push('🔴 CRITICAL: Correct picture is also in wrong pictures array!');
                    }
                }
            }

            // Report issues
            if (questionIssues.length > 0) {
                issueCount++;
                const chapterName = q.chapter?.chapterName?.en || 'Unknown Chapter';
                const subjectName = q.chapter?.subject?.subjectName?.en || 'Unknown Subject';
                
                issues.push({
                    number: issueCount,
                    questionId: q._id,
                    question: q.question,
                    type: q.typeOfAnswer,
                    chapter: chapterName,
                    subject: subjectName,
                    issues: questionIssues
                });
            }
        }

        // Print results
        if (issueCount === 0) {
            console.log('✅ No issues found! All questions have valid answers.');
        } else {
            issues.forEach(issue => {
                console.log(`Issue #${issue.number}`);
                console.log(`━`.repeat(60));
                console.log(`📍 Location: ${issue.subject} > ${issue.chapter}`);
                console.log(`🆔 Question ID: ${issue.questionId}`);
                console.log(`📝 Type: ${issue.type}`);
                console.log(`❓ Question: ${issue.question.substring(0, 100)}${issue.question.length > 100 ? '...' : ''}`);
                console.log(``);
                issue.issues.forEach(i => console.log(`   ${i}`));
                console.log(``);
            });

            console.log('='.repeat(60));
            console.log(`📊 SUMMARY: Found ${issueCount} question(s) with issues`);
            console.log('='.repeat(60));
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('');
        console.log('🔌 Database connection closed');
    }
}

auditQuestions();
