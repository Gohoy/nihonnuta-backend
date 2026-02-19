const pool = require("../db/pool");

async function createSuggestion({ song_id, line_index, time_ms, field, token_text, old_value, new_value, reason, submitted_by }) {
  const sql = `
    INSERT INTO lyrics_suggestions (song_id, line_index, time_ms, field, token_text, old_value, new_value, reason, submitted_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [song_id, line_index, time_ms || 0, field, token_text || '', old_value || '', new_value, reason || '', submitted_by]);
  return rows[0];
}

async function getSuggestionsBySong(song_id, status = 'pending') {
  const sql = `
    SELECT ls.*, u.username AS submitted_by_name
    FROM lyrics_suggestions ls
    LEFT JOIN users u ON u.user_id = ls.submitted_by
    WHERE ls.song_id = $1 AND ls.status = $2
    ORDER BY ls.line_index, ls.field, ls.created_at DESC
  `;
  const { rows } = await pool.query(sql, [song_id, status]);
  return rows;
}

async function getSuggestionsByUser(user_id, offset = 0, limit = 20) {
  const sql = `
    SELECT ls.*, s.song_name
    FROM lyrics_suggestions ls
    LEFT JOIN songs s ON s.song_id = ls.song_id
    WHERE ls.submitted_by = $1
    ORDER BY ls.created_at DESC
    OFFSET $2 LIMIT $3
  `;
  const { rows } = await pool.query(sql, [user_id, offset, limit]);
  return rows;
}

async function getSuggestionById(id) {
  const { rows } = await pool.query("SELECT * FROM lyrics_suggestions WHERE id = $1", [id]);
  return rows[0];
}

async function reviewSuggestion(id, status, reviewed_by) {
  const sql = `
    UPDATE lyrics_suggestions
    SET status = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [status, reviewed_by, id]);
  return rows[0];
}

async function applySuggestionToSong(suggestion) {
  const { song_id, time_ms, field, token_text, new_value } = suggestion;

  // Handle audio update
  if (field === 'audio') {
    await pool.query(
      "UPDATE songs SET audio_url = $1, update_time = NOW() WHERE song_id = $2",
      [new_value, song_id]
    );
    return { audio_url: new_value };
  }

  // Handle kana override separately
  if (field === 'kana') {
    return applyKanaOverride(song_id, time_ms, token_text, new_value);
  }

  const { rows } = await pool.query("SELECT lyrics FROM songs WHERE song_id = $1", [song_id]);
  if (!rows[0] || !rows[0].lyrics) return null;

  const lyricsData = rows[0].lyrics;
  const fieldToLrcKey = { original: 'lrc', translate: 'tlyric', roma: 'romalrc' };
  const lrcKey = fieldToLrcKey[field];
  if (!lrcKey || !lyricsData[lrcKey]) return null;

  const lrcText = lyricsData[lrcKey].lyric || '';
  const lines = lrcText.split('\n');
  let replaced = false;

  const newLines = lines.map(line => {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (match) {
      const mins = parseInt(match[1]);
      const secs = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const lineMs = mins * 60000 + secs * 1000 + ms;
      if (lineMs === time_ms) {
        replaced = true;
        return `[${match[1]}:${match[2]}.${match[3]}]${new_value}`;
      }
    }
    return line;
  });

  if (!replaced) return null;

  lyricsData[lrcKey].lyric = newLines.join('\n');

  if (field === 'original') {
    await pool.query(
      "UPDATE songs SET lyrics = $1, lyrics_text = $2, update_time = NOW() WHERE song_id = $3",
      [JSON.stringify(lyricsData), lyricsData.lrc.lyric, song_id]
    );
  } else {
    await pool.query(
      "UPDATE songs SET lyrics = $1, update_time = NOW() WHERE song_id = $2",
      [JSON.stringify(lyricsData), song_id]
    );
  }

  return lyricsData;
}

async function applyKanaOverride(song_id, time_ms, token_text, new_kana) {
  const { rows } = await pool.query("SELECT kana_overrides FROM songs WHERE song_id = $1", [song_id]);
  const overrides = (rows[0] && rows[0].kana_overrides) || {};
  const key = String(time_ms);
  if (!overrides[key]) overrides[key] = {};
  overrides[key][token_text] = new_kana;
  await pool.query(
    "UPDATE songs SET kana_overrides = $1, update_time = NOW() WHERE song_id = $2",
    [JSON.stringify(overrides), song_id]
  );
  return overrides;
}

module.exports = {
  createSuggestion,
  getSuggestionsBySong,
  getSuggestionsByUser,
  getSuggestionById,
  reviewSuggestion,
  applySuggestionToSong,
};
