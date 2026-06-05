const checkExpiration = (startingDate, expiryDate) => {
    const currentDate = new Date();
    const start = new Date(startingDate);
    start.setHours(0, 0, 0, 0);
    // Subtract 14 hours to allow starting as soon as it is midnight in the earliest timezone (UTC+14)
    start.setHours(start.getHours() - 14);

    const end = new Date(expiryDate);
    end.setHours(23, 59, 59, 999);
    // Add 36 hours (24 hours + 12 hours) to cover the full day in the latest timezone (UTC-12)
    end.setHours(end.getHours() + 36);

    if (currentDate <= end && currentDate >= start) {
        return false // not expire
    } else {
        return true // it is expire
    }
}

module.exports = checkExpiration;