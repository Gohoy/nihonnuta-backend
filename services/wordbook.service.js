const pool = require("../db/pool");

/**
 * 添加单词到单词本
 */
async function addWordToBook(userId, songId, lineNum, tokenId, wordData) {
  const sql = `
    INSERT INTO user_wordbooks (
      user_id, song_id, line_num, token_id, word, kana, pos, meaning, example_sentence, master_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unmastered')
    ON CONFLICT (user_id, song_id, line_num, token_id)
    DO UPDATE SET
      word = EXCLUDED.word,
      kana = EXCLUDED.kana,
      pos = EXCLUDED.pos,
      meaning = EXCLUDED.meaning,
      example_sentence = EXCLUDED.example_sentence
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [
    userId,
    songId,
    lineNum,
    tokenId,
    wordData.word || wordData.text,
    wordData.kana || '',
    wordData.pos || '',
    wordData.meaning || '',
    wordData.example_sentence || '',
  ]);
  return rows[0];
}

/**
 * 获取用户的单词本
 */
async function getUserWordbook(userId, options = {}) {
  const { masterStatus, limit = 50, offset = 0 } = options;
  let sql = `
    SELECT wb.*, s.song_name, s.singer
    FROM user_wordbooks wb
    LEFT JOIN songs s ON wb.song_id = s.song_id
    WHERE wb.user_id = $1
  `;
  const params = [userId];
  
  if (masterStatus) {
    sql += ` AND wb.master_status = $2`;
    params.push(masterStatus);
  }
  
  sql += ` ORDER BY wb.create_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const { rows } = await pool.query(sql, params);
  
  // 获取总数
  let countSql = `SELECT COUNT(*) FROM user_wordbooks WHERE user_id = $1`;
  const countParams = [userId];
  if (masterStatus) {
    countSql += ` AND master_status = $2`;
    countParams.push(masterStatus);
  }
  const countResult = await pool.query(countSql, countParams);
  
  return {
    words: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * 更新单词掌握状态
 */
async function updateWordMasterStatus(userId, wordBookId, masterStatus) {
  const sql = `
    UPDATE user_wordbooks
    SET master_status = $1,
        review_count = review_count + 1,
        last_review_time = CURRENT_TIMESTAMP
    WHERE word_book_id = $2 AND user_id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [masterStatus, wordBookId, userId]);
  return rows[0];
}

/**
 * 删除单词本中的单词
 */
async function removeWordFromBook(userId, wordBookId) {
  const sql = `
    DELETE FROM user_wordbooks
    WHERE word_book_id = $1 AND user_id = $2
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [wordBookId, userId]);
  return rows[0];
}

/**
 * 更新单词笔记
 */
async function updateWordNote(userId, wordBookId, note) {
  const sql = `
    UPDATE user_wordbooks
    SET note = $1
    WHERE word_book_id = $2 AND user_id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [note, wordBookId, userId]);
  return rows[0];
}

/**
 * 获取单词统计信息
 */
async function getWordbookStats(userId) {
  const sql = `
    SELECT 
      COUNT(*) as total_words,
      COUNT(*) FILTER (WHERE master_status = 'mastered') as mastered_words,
      COUNT(*) FILTER (WHERE master_status = 'learning') as learning_words,
      COUNT(*) FILTER (WHERE master_status = 'unmastered') as unmastered_words
    FROM user_wordbooks
    WHERE user_id = $1
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows[0];
}

/**
 * 获取待复习单词
 */
async function getDueWords(userId, limit = 20) {
  const sql = `
    SELECT wb.*, s.song_name, s.singer
    FROM user_wordbooks wb
    LEFT JOIN songs s ON wb.song_id = s.song_id
    WHERE wb.user_id = $1
      AND wb.next_review_date <= CURRENT_DATE
    ORDER BY wb.next_review_date ASC, wb.ease_factor ASC
    LIMIT $2
  `;
  const { rows } = await pool.query(sql, [userId, limit]);

  const countSql = `
    SELECT COUNT(*) FROM user_wordbooks
    WHERE user_id = $1 AND next_review_date <= CURRENT_DATE
  `;
  const countResult = await pool.query(countSql, [userId]);

  return {
    words: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * 提交单词复习结果（SM-2）
 */
async function reviewWord(userId, wordBookId, srsResult) {
  const sql = `
    UPDATE user_wordbooks
    SET ease_factor = $1,
        interval_days = $2,
        next_review_date = $3,
        review_count = review_count + 1,
        last_review_time = CURRENT_TIMESTAMP
    WHERE word_book_id = $4 AND user_id = $5
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [
    srsResult.easeFactor,
    srsResult.interval,
    srsResult.nextReviewDate,
    wordBookId,
    userId,
  ]);
  return rows[0];
}

module.exports = {
  addWordToBook,
  getUserWordbook,
  updateWordMasterStatus,
  removeWordFromBook,
  updateWordNote,
  getWordbookStats,
  getDueWords,
  reviewWord,
};

