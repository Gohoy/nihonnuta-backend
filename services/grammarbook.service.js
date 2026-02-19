const pool = require("../db/pool");

/**
 * 添加语法到语法本
 */
async function addGrammarToBook(userId, songId, lineNum, grammarId, grammarData) {
  const sql = `
    INSERT INTO user_grammar_books (
      user_id, song_id, line_num, grammar_id,
      related_token_ids, grammar_type, grammar_relation,
      structure_desc, grammar_desc, example_sentence, master_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unmastered')
    ON CONFLICT (user_id, song_id, line_num, grammar_id)
    DO UPDATE SET
      related_token_ids = EXCLUDED.related_token_ids,
      grammar_type = EXCLUDED.grammar_type,
      grammar_relation = EXCLUDED.grammar_relation,
      structure_desc = EXCLUDED.structure_desc,
      grammar_desc = EXCLUDED.grammar_desc,
      example_sentence = EXCLUDED.example_sentence,
      update_time = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [
    userId,
    songId,
    lineNum,
    grammarId,
    JSON.stringify(grammarData.related_token_ids || []),
    grammarData.grammar_type || '',
    grammarData.grammar_relation || '',
    grammarData.structure_desc || '',
    grammarData.grammar_desc || '',
    grammarData.example_sentence || '',
  ]);
  return rows[0];
}

/**
 * 获取用户的语法本
 */
async function getUserGrammarBook(userId, options = {}) {
  const { masterStatus, limit = 50, offset = 0 } = options;
  let sql = `
    SELECT gb.*, s.song_name, s.singer
    FROM user_grammar_books gb
    LEFT JOIN songs s ON gb.song_id = s.song_id
    WHERE gb.user_id = $1
  `;
  const params = [userId];
  
  if (masterStatus) {
    sql += ` AND gb.master_status = $2`;
    params.push(masterStatus);
  }
  
  sql += ` ORDER BY gb.create_time DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const { rows } = await pool.query(sql, params);
  
  // 解析 JSONB 字段
  rows.forEach(row => {
    if (row.related_token_ids && typeof row.related_token_ids === 'string') {
      try {
        row.related_token_ids = JSON.parse(row.related_token_ids);
      } catch (e) {
        row.related_token_ids = [];
      }
    }
  });
  
  // 获取总数
  let countSql = `SELECT COUNT(*) FROM user_grammar_books WHERE user_id = $1`;
  const countParams = [userId];
  if (masterStatus) {
    countSql += ` AND master_status = $2`;
    countParams.push(masterStatus);
  }
  const countResult = await pool.query(countSql, countParams);
  
  return {
    grammars: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * 更新语法掌握状态
 */
async function updateGrammarMasterStatus(userId, grammarBookId, masterStatus) {
  const sql = `
    UPDATE user_grammar_books
    SET master_status = $1,
        review_count = review_count + 1,
        last_review_time = CURRENT_TIMESTAMP
    WHERE grammar_book_id = $2 AND user_id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [masterStatus, grammarBookId, userId]);
  return rows[0];
}

/**
 * 删除语法本中的语法
 */
async function removeGrammarFromBook(userId, grammarBookId) {
  const sql = `
    DELETE FROM user_grammar_books
    WHERE grammar_book_id = $1 AND user_id = $2
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [grammarBookId, userId]);
  return rows[0];
}

/**
 * 更新语法笔记
 */
async function updateGrammarNote(userId, grammarBookId, note) {
  const sql = `
    UPDATE user_grammar_books
    SET note = $1
    WHERE grammar_book_id = $2 AND user_id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [note, grammarBookId, userId]);
  return rows[0];
}

/**
 * 获取语法统计信息
 */
async function getGrammarBookStats(userId) {
  const sql = `
    SELECT 
      COUNT(*) as total_grammars,
      COUNT(*) FILTER (WHERE master_status = 'mastered') as mastered_grammars,
      COUNT(*) FILTER (WHERE master_status = 'learning') as learning_grammars,
      COUNT(*) FILTER (WHERE master_status = 'unmastered') as unmastered_grammars
    FROM user_grammar_books
    WHERE user_id = $1
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows[0];
}

/**
 * 获取待复习语法
 */
async function getDueGrammars(userId, limit = 20) {
  const sql = `
    SELECT gb.*, s.song_name, s.singer
    FROM user_grammar_books gb
    LEFT JOIN songs s ON gb.song_id = s.song_id
    WHERE gb.user_id = $1
      AND gb.next_review_date <= CURRENT_DATE
    ORDER BY gb.next_review_date ASC, gb.ease_factor ASC
    LIMIT $2
  `;
  const { rows } = await pool.query(sql, [userId, limit]);

  rows.forEach(row => {
    if (row.related_token_ids && typeof row.related_token_ids === 'string') {
      try { row.related_token_ids = JSON.parse(row.related_token_ids); }
      catch (e) { row.related_token_ids = []; }
    }
  });

  const countSql = `
    SELECT COUNT(*) FROM user_grammar_books
    WHERE user_id = $1 AND next_review_date <= CURRENT_DATE
  `;
  const countResult = await pool.query(countSql, [userId]);

  return {
    grammars: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * 提交语法复习结果（SM-2）
 */
async function reviewGrammar(userId, grammarBookId, srsResult) {
  const sql = `
    UPDATE user_grammar_books
    SET ease_factor = $1,
        interval_days = $2,
        next_review_date = $3,
        review_count = review_count + 1,
        last_review_time = CURRENT_TIMESTAMP
    WHERE grammar_book_id = $4 AND user_id = $5
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [
    srsResult.easeFactor,
    srsResult.interval,
    srsResult.nextReviewDate,
    grammarBookId,
    userId,
  ]);
  return rows[0];
}

module.exports = {
  addGrammarToBook,
  getUserGrammarBook,
  updateGrammarMasterStatus,
  removeGrammarFromBook,
  updateGrammarNote,
  getGrammarBookStats,
  getDueGrammars,
  reviewGrammar,
};

