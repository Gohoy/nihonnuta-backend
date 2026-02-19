/**
 * SM-2 Spaced Repetition Algorithm
 *
 * @param {number} quality    - 0=Again, 1=Hard, 2=Good, 3=Easy
 * @param {number} easeFactor - current ease factor (>= 1.3)
 * @param {number} interval   - current interval in days
 * @param {number} reviewCount - total reviews so far
 * @returns {{ easeFactor: number, interval: number, nextReviewDate: string }}
 */
function sm2(quality, easeFactor, interval, reviewCount) {
  // Map 0-3 scale to SM-2's 0-5 scale: 0→0, 1→2, 2→4, 3→5
  const q = [0, 2, 4, 5][quality] ?? 0;

  let newEF = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval;
  if (q < 3) {
    // Failed — reset
    newInterval = 1;
  } else if (reviewCount <= 1) {
    newInterval = 1;
  } else if (reviewCount === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEF);
  }

  const next = new Date();
  next.setDate(next.getDate() + newInterval);
  const nextReviewDate = next.toISOString().slice(0, 10);

  return {
    easeFactor: Math.round(newEF * 100) / 100,
    interval: newInterval,
    nextReviewDate,
  };
}

module.exports = { sm2 };
