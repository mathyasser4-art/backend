const { auditLevel1Question } = require('./audit-level1-engine');

const chooseTypeId = '65a4963482dbaac16d820fc6'; // MCQ (Choose)
const completeTypeId = '65a4964b82dbaac16d820fc8'; // Essay (Complete)

const LEVEL_1_SUBJECTS = [
  { name: '+- from 1 to 9 (Ones)', id: '69e1d6413b0cd13f2150883a' },
  { name: 'Exercises on (Ones , Tens)', id: '69e1d6833b0cd13f21508840' },
  { name: 'Exercises on (Ones , Tens , Hundreds)', id: '69e1d6ad3b0cd13f21508846' }
];

function extractExpectedRows(name) {
  const m = name.match(/(\d+)\s*rows?/i);
  return m ? parseInt(m[1], 10) : null;
}

function simulateFrontendChoices(q) {
  const normalize = (v) => (v === undefined || v === null ? '' : v.toString().trim());
  const correctVal = normalize(q.correctAnswer || '');
  let uniqueChoices = Array.from(new Set((q.wrongAnswer || []).map(normalize)));
  if (correctVal && !uniqueChoices.includes(correctVal)) {
    uniqueChoices.push(correctVal);
  }
  if (uniqueChoices.length > 4) {
    const incorrects = uniqueChoices.filter(c => c !== correctVal);
    uniqueChoices = [correctVal, ...incorrects.slice(0, 3)];
  }
  return {
    choices: uniqueChoices,
    count: uniqueChoices.length,
    hasCorrect: uniqueChoices.includes(correctVal)
  };
}

async function auditSubject(subject) {
  console.log('\n' + '='.repeat(80));
  console.log(`📌 SUBJECT: ${subject.name} (ID: ${subject.id})`);
  console.log('='.repeat(80));

  const modes = [
    { typeName: 'CHOOSE (MCQ)', typeId: chooseTypeId, isMCQ: true },
    { typeName: 'COMPLETE (Essay)', typeId: completeTypeId, isMCQ: false }
  ];

  let subjectQuestions = 0;
  let subjectIssues = 0;
  const subjectSummaryByChapter = [];

  for (const mode of modes) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`📂 MODE: ${mode.typeName}`);
    console.log(`------------------------------------------------------------`);
    
    let unitRes;
    try {
      const res = await fetch(`https://backend-production-6752.up.railway.app/unit/getUnit/${mode.typeId}/${subject.id}`);
      unitRes = await res.json();
    } catch (e) {
      console.error(`❌ Error fetching units for ${mode.typeName}:`, e.message);
      continue;
    }

    const units = unitRes.allUnit || [];
    if (units.length === 0) {
      console.log('   (No units found)');
      continue;
    }

    for (const unit of units) {
      console.log(`\n  📁 Unit: "${unit.unitName}" (ID: ${unit._id})`);
      for (const ch of (unit.chapters || [])) {
        const expectedRows = extractExpectedRows(ch.chapterName) || extractExpectedRows(unit.unitName);
        console.log(`    📖 Chapter: "${ch.chapterName}" (ID: ${ch._id}, Total: ${ch.questions?.length || 0}${expectedRows ? `, Target Rows: ${expectedRows}` : ''})`);

        let chData;
        try {
          const qRes = await fetch(`https://backend-production-6752.up.railway.app/chapter/getChapterQuestion/${ch._id}`);
          chData = await qRes.json();
        } catch (e) {
          console.error(`      ❌ Error fetching chapter questions:`, e.message);
          continue;
        }

        const questions = chData.chapter?.questions || [];
        subjectQuestions += questions.length;

        let chapterIssues = 0;
        const problemList = [];

        questions.forEach((q, idx) => {
          const qNum = idx + 1;
          const audit = auditLevel1Question(q, expectedRows);
          const qIssues = [];

          // Add skill leakage and math mismatch issues from auditLevel1Question
          audit.issues.forEach(iss => {
            qIssues.push(iss);
          });

          // Specific format validations
          if (mode.isMCQ) {
            if (!q.correctAnswer || q.correctAnswer.toString().trim() === '') {
              qIssues.push({ type: 'MISSING_CORRECT_ANSWER', msg: 'Missing correctAnswer' });
            }
            const sim = simulateFrontendChoices(q);
            if (sim.count !== 4) {
              qIssues.push({
                type: 'MCQ_COUNT_ERROR',
                msg: `UI displays ${sim.count} choices instead of 4: [${sim.choices.join(', ')}]`
              });
            }
            if (!sim.hasCorrect) {
              qIssues.push({
                type: 'MCQ_MISSING_CORRECT_IN_UI',
                msg: `Correct answer (${q.correctAnswer}) not in choices: [${sim.choices.join(', ')}]`
              });
            }
          } else {
            // Essay / Complete
            if (!q.answer || q.answer.length === 0) {
              qIssues.push({ type: 'MISSING_ANSWER_ARRAY', msg: 'Empty answer array' });
            } else {
              const expectedStr = audit.expectedAns;
              const hasExpected = q.answer.some(a => a && a.toString().trim() === expectedStr);
              if (!hasExpected) {
                qIssues.push({
                  type: 'ESSAY_ANSWER_MISMATCH',
                  msg: `Expected answer ${expectedStr} not in answer array [${q.answer.join(', ')}]`
                });
              }
            }
          }

          if (qIssues.length > 0) {
            chapterIssues++;
            subjectIssues++;
            problemList.push({
              qNum,
              questionId: q._id,
              text: q.question.replace(/[\r\n]+/g, ' '),
              expectedAns: audit.expectedAns,
              actualAns: mode.isMCQ ? q.correctAnswer : JSON.stringify(q.answer),
              issues: qIssues
            });
          }
        });

        subjectSummaryByChapter.push({
          unit: unit.unitName,
          chapter: ch.chapterName,
          mode: mode.typeName,
          total: questions.length,
          issues: chapterIssues
        });

        if (chapterIssues === 0) {
          console.log(`      ✅ 100% PERFECT (${questions.length}/${questions.length} questions verified: pure direct, math correct, choices valid)`);
        } else {
          console.log(`      ⚠️  ${chapterIssues} issue(s) found in ${questions.length} questions:`);
          problemList.slice(0, 10).forEach(p => {
            console.log(`         Q#${p.qNum} [${p.text}] Expected: ${p.expectedAns}, Actual: ${p.actualAns}`);
            p.issues.forEach(i => console.log(`           ↳ [${i.type}] ${i.msg}`));
          });
          if (problemList.length > 10) {
            console.log(`         ... and ${problemList.length - 10} more issues in this chapter.`);
          }
        }
      }
    }
  }

  return { subjectQuestions, subjectIssues, summary: subjectSummaryByChapter };
}

async function main() {
  console.log('🚀 RUNNING DEEP AUDIT FOR LEVEL 1 (ALL UNITS & CHAPTERS)');
  console.log('Timestamp:', new Date().toISOString());

  let totalQ = 0;
  let totalIss = 0;
  const allSummaries = [];

  for (const subj of LEVEL_1_SUBJECTS) {
    const res = await auditSubject(subj);
    totalQ += res.subjectQuestions;
    totalIss += res.subjectIssues;
    allSummaries.push({ subject: subj.name, ...res });
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏆 COMPREHENSIVE LEVEL 1 AUDIT REPORT');
  console.log('='.repeat(80));
  console.log(`Total Questions Audited Across Level 1: ${totalQ}`);
  console.log(`Total Issues Detected: ${totalIss}`);
  console.log('\nDetailed Breakdown by Subject & Chapter:');
  for (const s of allSummaries) {
    console.log(`\n📌 ${s.subject} (${s.subjectQuestions} questions, ${s.subjectIssues} issues):`);
    for (const item of s.summary) {
      const statusIcon = item.issues === 0 ? '✅' : '⚠️ ';
      console.log(`   ${statusIcon} [${item.mode}] ${item.unit} -> "${item.chapter}": ${item.issues === 0 ? 'ALL CLEAN' : item.issues + ' issues'} (${item.total} questions)`);
    }
  }
}

main().catch(console.error);
