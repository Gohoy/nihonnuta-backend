// 运行数据库迁移脚本
const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const migrationFile = path.join(__dirname, '../db/migrations/20250207_fix_audio_url_length.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  try {
    console.log('执行数据库迁移...');
    await pool.query(sql);
    console.log('✅ 迁移成功完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  }
}

runMigration();
