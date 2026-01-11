const pool = require('../db/pool');

/* Create */
async function createSong(song) {
    const sql = `
    INSERT INTO songs (song_id, song_name, singer, difficulty, audio_url, lyrics)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
    await pool.query(sql, [
        song.song_id,
        song.song_name,
        song.singer,
        song.difficulty,
        song.audio_url,
        song.lyrics,
    ]);
}

/* Read */
async function getSongById(songId) {
    const { rows } = await pool.query(
        'SELECT * FROM songs WHERE song_id = $1',
        [songId]
    );
    return rows[0];
}
// 分页获取
async function getSongs(offset, limit) {
    if (!limit ) {
        limit = 10;
    }

    const { rows } = await pool.query(
        'SELECT * FROM songs ORDER BY create_time DESC OFFSET $1 LIMIT $2',
        [offset, limit]
    );
    const count = await pool.query('SELECT COUNT(*) FROM songs');
    return rows, parseInt(count.rows[0].count, 10);
}

/* Update */
async function updatePlayCount(songId) {
    await pool.query(
        'UPDATE songs SET play_count = play_count + 1 WHERE song_id = $1',
        [songId]
    );
}

/* Delete（软删建议） */
async function hideSong(songId) {
    await pool.query(
        'UPDATE songs SET status = $1 WHERE song_id = $2',
        ['offline', songId]
    );
}
// search
async function searchSongs(keywords, offset, limit) {
    const searchPattern = `%${keywords}%`;
    const { rows } = await pool.query(
        `SELECT * FROM songs 
         WHERE song_name ILIKE $1 OR singer ILIKE $1
         ORDER BY create_time DESC 
         OFFSET $2 LIMIT $3`,
        [searchPattern, offset, limit]
    );
    const countResult = await pool.query(
        `SELECT COUNT(*) FROM songs 
         WHERE song_name ILIKE $1 OR singer ILIKE $1`,
        [searchPattern]
    );
    return {
        songs: rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
}

module.exports = {
    createSong,
    getSongById,
    updatePlayCount,
    hideSong,
    getSongs,
    searchSongs,
};
