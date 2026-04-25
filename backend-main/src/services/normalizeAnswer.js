/**
 * Normalizes answers for comparison
 * Handles:
 * - Arabic to English digit conversion
 * - Whitespace trimming
 * - String type conversion
 * - Case normalization (optional)
 */

const normalizeAnswer = (answer, options = {}) => {
    const { toLowerCase = false } = options;
    
    // Handle null, undefined, or non-string values
    if (answer === null || answer === undefined) {
        return '';
    }
    
    // Convert to string if it's a number
    let normalizedAnswer = String(answer);
    
    // Convert Arabic digits to English digits
    const arabicToEnglish = {
        '٠': '0',
        '١': '1',
        '٢': '2',
        '٣': '3',
        '٤': '4',
        '٥': '5',
        '٦': '6',
        '٧': '7',
        '٨': '8',
        '٩': '9'
    };
    
    // Replace each Arabic digit with English equivalent
    for (const [arabic, english] of Object.entries(arabicToEnglish)) {
        normalizedAnswer = normalizedAnswer.split(arabic).join(english);
    }
    
    // Trim whitespace from both ends
    normalizedAnswer = normalizedAnswer.trim();
    
    // Convert to lowercase if requested (useful for Essay-type questions)
    if (toLowerCase) {
        normalizedAnswer = normalizedAnswer.toLowerCase();
    }
    
    return normalizedAnswer;
};

module.exports = normalizeAnswer;
