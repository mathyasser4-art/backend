/**
 * Scan all questions in the database and report any that have negative
 * intermediate steps in their arithmetic expression.
 *
 * Usage:  node scan-negative-questions.js
 *
 * Requires: MONGODB_URI env var or defaults to the same DB as the server.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URL || process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('❌ No MongoDB URI found. Set MONGODB_URI in .env');
    process.exit(1);
}

// ── Arabic digit normaliser ──────────────────────────────────────────────────
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function normalizeDigits(str) {
    return String(str).replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => ARABIC_DIGITS.indexOf(d).toString());
}

// ── Negative intermediate step checker ───────────────────────────────────────
function checkNegative(questionText) {
    if (!questionText || typeof questionText !== 'string') return null;

    let expr = normalizeDigits(questionText).replace(/=.*$/, '').trim();
    if (/[×÷xX*\/]/i.test(expr)) return null; // skip mult/div

    const tokens = expr.match(/(\d+\.?\d*|[+\-])/g);
    if (!tokens || tokens.length === 0) return null;

    let total = 0;
    let op = '+';
    let step = 0;

    for (const t of tokens) {
        if (t === '+' || t === '-') { op = t; continue; }
        const num = parseFloat(t);
        if (isNaN(num)) continue;
        total = op === '+' ? total + num : total - num;
        step++;
        if (total < 0) return { step, value: total };
    }
    return null;
}

// ── Main scan ────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    const questionModel = mongoose.model('question', new mongoose.Schema({}, { strict: false }));
    const questions = await questionModel.find({}, 'question chapter').lean();

    console.log(`📊 Total questions in database: ${questions.length}\n`);

    const bad = [];
    for (const q of questions) {
        const neg = checkNegative(q.question);
        if (neg) {
            bad.push({ id: q._id, text: q.question, chapter: q.chapter, ...neg });
        }
    }

    if (bad.length === 0) {
        console.log('🎉 No questions with negative intermediate steps found!');
    } else {
        console.log(`⚠️  Found ${bad.length} question(s) with negative intermediate steps:\n`);
        bad.forEach((b, i) => {
            console.log(`  ${i + 1}. [ID: ${b.id}]`);
            console.log(`     Question: "${b.text}"`);
            console.log(`     Goes negative (${b.value}) at step ${b.step}`);
            console.log(`     Chapter: ${b.chapter || 'N/A'}`);
            console.log('');
        });
    }

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
