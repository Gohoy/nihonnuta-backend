const pool = require("../db/pool");

/**
 * Convert user level (N1-N5) to target JLPT tag numbers.
 * Returns current level and harder (lower number = harder).
 * E.g., N3 → [1, 2, 3] (show N1, N2, N3 words)
 */
function levelToTagNumbers(level) {
  const levelNum = parseInt(level.replace("N", ""));
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 5) return [1, 2, 3, 4, 5];
  const result = [];
  for (let i = 1; i <= levelNum; i++) {
    result.push(i);
  }
  return result;
}

/**
 * Extract vocabulary from processed lyrics, filtered by JLPT level.
 * Deduplicates by base_form.
 */
function extractVocabulary(lyricsData, targetTagNumbers, allWords = {}) {
  const lines = lyricsData.lines || lyricsData || [];
  const linesArr = Array.isArray(lines) ? lines : [];
  const wordMap = new Map();

  for (const line of linesArr) {
    if (!line.tokens) continue;
    // Skip non-lyric lines (metadata like 作词/作曲 have no translate/roma)
    if (!line.translate && !line.roma) continue;
    for (const token of line.tokens) {
      if (!token.tags || token.tags.length === 0) continue;
      // Find the easiest (highest number) JLPT level from all tags.
      // A word tagged [JLPT_1, JLPT_3] is introduced at N3, not N1.
      let bestTag = null;
      let bestNum = 0;
      for (const tag of token.tags) {
        const m = tag.match(/^JLPT_(\d)$/);
        if (m) {
          const num = parseInt(m[1]);
          if (num > bestNum) {
            bestNum = num;
            bestTag = tag;
          }
        }
      }
      if (!bestTag || !targetTagNumbers.includes(bestNum)) continue;

      const key = token.base_form || token.text;
      if (wordMap.has(key)) continue;

      const dictEntry = allWords[key] || allWords[token.text] || {};
      wordMap.set(key, {
        word: token.text,
        base_form: key,
        kana: token.kana,
        pos: token.pos,
        jlpt_level: bestTag,
        meaning: dictEntry.meaning || "",
        example: line.original || "",
      });
    }
  }
  return Array.from(wordMap.values());
}

/**
 * Get set of mastered words for a user.
 */
async function getMasteredWords(userId) {
  if (!userId) return new Set();
  const { rows } = await pool.query(
    "SELECT word FROM user_wordbooks WHERE user_id = $1 AND master_status = 'mastered'",
    [userId]
  );
  return new Set(rows.map((r) => r.word));
}

module.exports = { levelToTagNumbers, extractVocabulary, getMasteredWords };
