// 数据库迁移控制器
const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

async function runMigration(req, res) {
  try {
    const migrationFile = path.join(__dirname, '../db/migrations/20250207_fix_audio_url_length.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('执行数据库迁移: 20250207_fix_audio_url_length.sql');
    await pool.query(sql);
    
    return res.success({ message: '数据库迁移成功完成' });
  } catch (error) {
    console.error('迁移失败:', error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  runMigration,
};

