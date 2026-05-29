const mongoose = require('mongoose');
const dns = require('dns');

// Override default local DNS to use public Google and Cloudflare DNS to bypass any local SRV query blocks
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('⚠️ Warning: Failed to set public DNS servers, using system default.');
}

require('dotenv').config();

const questionModel = require('./DB/models/question.model');
const chapterModel = require('./DB/models/chapter.model');

// Custom evaluator function to parse and evaluate standard arithmetic strings
function evaluateMath(expression) {
    if (!expression || typeof expression !== 'string') return null;

    // 1. Clean expression
    let cleaned = expression
        .replace(/×/g, '*')
        .replace(/x/gi, '*')
        .replace(/÷/g, '/')
        .replace(/=\s*\?/g, '')
        .replace(/=\s*/g, '')
        .replace(/\s+/g, '');

    // 2. Strict validation: only digits, decimal dots, operators +, -, *, /, and parentheses () are allowed
    const isStrictArithmetic = /^[0-9+\-*/().]+$/.test(cleaned);
    if (!isStrictArithmetic) {
        return null; // Not a strictly numeric arithmetic expression (could be a word problem or image prompt)
    }

    try {
        // Safe evaluation of strict mathematical expression
        const result = Function(`"use strict"; return (${cleaned})`)();
        
        // Return rounded to 4 decimal places to prevent float rounding mismatch
        return typeof result === 'number' && !isNaN(result) ? Math.round(result * 10000) / 10000 : null;
    } catch (err) {
        return null;
    }
}

async function runMathAudit() {
    const shouldFix = process.argv.includes('--fix');
    
    console.log('============================================================');
    console.log('🔍  ABACUS HEROES - MATHEMATICAL DATABASE AUDIT TOOL');
    console.log('============================================================');
    if (shouldFix) {
        console.log('⚠️  Mode: AUDIT & AUTO-FIX (Mismatches will be corrected in DB)\n');
    } else {
        console.log('ℹ️  Mode: AUDIT ONLY (Pass --fix to automatically correct errors)\n');
    }

    try {
        console.log('🔗 Connecting to database...');
        const dbUri = process.env.ONLINE_CONNECTION_DB || 'mongodb+srv://abacus_db_user:Csk2k0ar6tVcBduq@cluster0.1z1lw9l.mongodb.net/abacus?appName=Cluster0';
        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected successfully.\n');

        console.log('📦 Fetching all questions from database...');
        const questions = await questionModel.find().populate('chapter');
        console.log(`✓ Staged ${questions.length} questions for analysis.\n`);

        let auditedCount = 0;
        let mismatchCount = 0;
        let nonArithmeticCount = 0;
        const mismatches = [];

        for (const q of questions) {
            const expressionText = q.question;
            const evaluated = evaluateMath(expressionText);

            if (evaluated === null) {
                nonArithmeticCount++;
                continue; // Skip conceptual or non-pure-math questions
            }

            auditedCount++;
            let storedAnswerText = '';
            
            if (q.typeOfAnswer === 'Essay') {
                storedAnswerText = q.answer && q.answer[0] ? q.answer[0] : '';
            } else if (q.typeOfAnswer === 'MCQ') {
                storedAnswerText = q.correctAnswer || '';
            } else {
                continue; // Graph questions are image-based and skipped
            }

            const storedNum = parseFloat(storedAnswerText);
            const isMatch = !isNaN(storedNum) && Math.abs(storedNum - evaluated) < 0.0001;

            if (!isMatch) {
                mismatchCount++;
                mismatches.push({
                    id: q._id,
                    expression: expressionText,
                    type: q.typeOfAnswer,
                    chapterName: q.chapter ? q.chapter.chapterName?.en || 'Unknown' : 'Unknown',
                    stored: storedAnswerText,
                    evaluated: evaluated,
                    document: q
                });
            }
        }

        console.log('============================================================');
        console.log('🚨  AUDIT ANALYSIS REPORT');
        console.log('============================================================');
        console.log(`- Total Staged Questions:  ${questions.length}`);
        console.log(`- Evaluated Math Tasks:   ${auditedCount}`);
        console.log(`- Skipped Non-Math Tasks:  ${nonArithmeticCount}`);
        console.log(`- Mismatches Detected:     ${mismatchCount}`);
        console.log('============================================================\n');

        if (mismatchCount === 0) {
            console.log('🎉 EXCELLENT! All evaluated math questions have 100% correct stored answers!');
        } else {
            console.log('❌ MISMATCHED RECORDS DETECTED:\n');
            
            for (const item of mismatches) {
                console.log(`📍 Chapter:    ${item.chapterName}`);
                console.log(`🆔 ID:         ${item.id}`);
                console.log(`📝 Expression: "${item.expression}"`);
                console.log(`Stored Answer: "${item.stored}"`);
                console.log(`Correct Math:  ${item.evaluated}`);
                
                if (shouldFix) {
                    const qDoc = item.document;
                    if (qDoc.typeOfAnswer === 'Essay') {
                        qDoc.answer = [String(item.evaluated)];
                    } else if (qDoc.typeOfAnswer === 'MCQ') {
                        qDoc.correctAnswer = String(item.evaluated);
                    }
                    await qDoc.save();
                    console.log('🟢 AUTO-FIXED: Successfully corrected stored answer in DB.');
                }
                console.log('------------------------------------------------------------');
            }
            
            if (shouldFix) {
                console.log(`\n🎉 SUCCESS: All ${mismatchCount} database errors have been auto-corrected in the database!`);
            } else {
                console.log('\n👉 Tip: Run this script with the --fix argument to automatically correct all errors in the database:');
                console.log('   node test-questions-math.js --fix');
            }
        }

        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed gracefully.');
        process.exit(0);

    } catch (err) {
        console.error('❌ Unexpected error during audit:', err);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

runMathAudit();
