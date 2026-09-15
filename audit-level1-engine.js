const fs = require('fs');

// Helper to check if a single-digit step on a single rod is purely direct
function isDirectMoveOnRod(currentRodVal, deltaDigit) {
  const nextRodVal = currentRodVal + deltaDigit;
  if (nextRodVal < 0 || nextRodVal > 9) {
    return { ok: false, reason: `Rod overflow/underflow: ${currentRodVal} + (${deltaDigit}) = ${nextRodVal}` };
  }

  const currentUpper = currentRodVal >= 5 ? 1 : 0;
  const currentLower = currentRodVal % 5;

  if (deltaDigit > 0) {
    const deltaUpper = deltaDigit >= 5 ? 1 : 0;
    const deltaLower = deltaDigit % 5;
    if (deltaUpper === 1 && currentUpper === 1) {
      return { ok: false, reason: `Upper bead already in use for +${deltaDigit} on rod (current ${currentRodVal})` };
    }
    if (deltaLower > (4 - currentLower)) {
      return { ok: false, reason: `Not enough lower beads for +${deltaDigit} on rod (current ${currentRodVal}, need ${deltaLower}, free ${4 - currentLower})` };
    }
  } else if (deltaDigit < 0) {
    const absDelta = Math.abs(deltaDigit);
    const deltaUpper = absDelta >= 5 ? 1 : 0;
    const deltaLower = absDelta % 5;
    if (deltaUpper === 1 && currentUpper === 0) {
      return { ok: false, reason: `Upper bead not active for -${absDelta} on rod (current ${currentRodVal})` };
    }
    if (deltaLower > currentLower) {
      return { ok: false, reason: `Not enough lower beads for -${absDelta} on rod (current ${currentRodVal}, need ${deltaLower}, active ${currentLower})` };
    }
  }

  return { ok: true, nextRodVal };
}

// Parse question string into numbers
function parseNumbers(questionText) {
  if (!questionText || typeof questionText !== 'string') return [];
  const tokens = questionText.trim().split(/[\r\n\s]+/).filter(Boolean);
  return tokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
}

// Analyze question for Level 1 suitability
function auditLevel1Question(q, expectedRows = null) {
  const issues = [];
  const numbers = parseNumbers(q.question);

  if (numbers.length === 0) {
    issues.push({ type: 'EMPTY_QUESTION', msg: 'Could not parse any numbers from question text' });
    return { ok: false, issues, numbers, expectedAns: null };
  }

  if (expectedRows && numbers.length !== expectedRows) {
    issues.push({ type: 'ROW_COUNT_MISMATCH', msg: `Expected ${expectedRows} rows, got ${numbers.length}` });
  }

  const maxDigits = Math.max(...numbers.map(n => Math.abs(n).toString().length));
  let rodValues = new Array(maxDigits).fill(0);
  let cumulativeSum = 0;

  for (let stepIdx = 0; stepIdx < numbers.length; stepIdx++) {
    const num = numbers[stepIdx];
    cumulativeSum += num;
    if (cumulativeSum < 0) {
      issues.push({
        type: 'NEGATIVE_CUMULATIVE',
        msg: `Step ${stepIdx + 1} (${num}): Cumulative sum dropped below zero (${cumulativeSum})`
      });
    }

    const sign = num >= 0 ? 1 : -1;
    const absStr = Math.abs(num).toString().padStart(maxDigits, '0');
    const digits = absStr.split('').reverse().map(d => parseInt(d, 10));

    for (let rod = 0; rod < maxDigits; rod++) {
      const deltaDigit = sign * digits[rod];
      if (deltaDigit === 0) continue;

      const res = isDirectMoveOnRod(rodValues[rod], deltaDigit);
      if (!res.ok) {
        issues.push({
          type: 'SKILL_LEAKAGE',
          msg: `Step ${stepIdx + 1} (${num}) on Rod ${rod} (${rod === 0 ? 'Ones' : rod === 1 ? 'Tens' : 'Hundreds'}): ${res.reason}`
        });
      } else {
        rodValues[rod] = res.nextRodVal;
      }
    }
  }

  const expectedAns = cumulativeSum.toString();
  const actualAns = q.correctAnswer || (Array.isArray(q.answer) ? q.answer[0] : q.answer);

  if (actualAns !== undefined && actualAns !== null && actualAns.toString().trim() !== expectedAns) {
    issues.push({
      type: 'MATH_MISMATCH',
      msg: `Expected answer ${expectedAns}, but recorded answer is ${actualAns}`
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    numbers,
    expectedAns,
    actualAns
  };
}

module.exports = {
  isDirectMoveOnRod,
  parseNumbers,
  auditLevel1Question
};
