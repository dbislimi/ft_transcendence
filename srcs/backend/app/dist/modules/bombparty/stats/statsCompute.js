export function computeUpdatedUserStats(existingStats, matchData) {
    const newTotalMatches = existingStats.total_matches + 1;
    const newTotalWins = existingStats.total_wins + (matchData.isWin ? 1 : 0);
    const newTotalWordsSubmitted = existingStats.total_words_submitted + matchData.wordsSubmitted;
    const newTotalValidWords = existingStats.total_valid_words + matchData.validWords;
    const newBestStreak = Math.max(existingStats.best_streak, matchData.bestStreak);
    const newTotalPlayTime = existingStats.total_play_time + matchData.matchDuration;
    const totalResponseTime = existingStats.average_response_time * existingStats.total_words_submitted +
        matchData.averageResponseTime * matchData.wordsSubmitted;
    const newAverageResponseTime = newTotalWordsSubmitted > 0 ?
        totalResponseTime / newTotalWordsSubmitted : 0;
    return {
        newTotalMatches,
        newTotalWins,
        newTotalWordsSubmitted,
        newTotalValidWords,
        newBestStreak,
        newTotalPlayTime,
        newAverageResponseTime
    };
}
export function computeNewUserStats(userId, matchData) {
    return {
        totalMatches: 1,
        totalWins: matchData.isWin ? 1 : 0,
        totalWordsSubmitted: matchData.wordsSubmitted,
        totalValidWords: matchData.validWords,
        bestStreak: matchData.bestStreak,
        averageResponseTime: matchData.averageResponseTime,
        totalPlayTime: matchData.matchDuration
    };
}
export function computeUpdatedTrigramStats(existingStats, isSuccess, responseTime) {
    const newTimesUsed = existingStats.times_used + 1;
    const newSuccessCount = Math.round(existingStats.success_rate * existingStats.times_used) + (isSuccess ? 1 : 0);
    const newSuccessRate = newSuccessCount / newTimesUsed;
    const totalTime = existingStats.average_time * existingStats.times_used + responseTime;
    const newAverageTime = totalTime / newTimesUsed;
    return {
        newTimesUsed,
        newSuccessRate,
        newAverageTime
    };
}
export function computeNewTrigramStats(isSuccess, responseTime) {
    return {
        timesUsed: 1,
        successRate: isSuccess ? 1 : 0,
        averageTime: responseTime
    };
}
export function calculateWinRate(totalWins, totalMatches) {
    return totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
}
export function calculateAccuracy(totalValidWords, totalWordsSubmitted) {
    return totalWordsSubmitted > 0 ? (totalValidWords / totalWordsSubmitted) * 100 : 0;
}
