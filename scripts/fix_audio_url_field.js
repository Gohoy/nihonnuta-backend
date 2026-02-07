// 修复audio_url字段长度限制的脚本
const pool = require('../db/pool');

async function fixAudioUrlField() {
  try {
    console.log('开始修复audio_url字段...');
    
    // 检查当前字段类型
    const checkResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'songs' AND column_name = 'audio_url'
    `);
    
    console.log('当前字段信息:', checkResult.rows[0]);
    
    // 修改字段类型为TEXT
    await pool.query(`
      ALTER TABLE songs 
      ALTER COLUMN audio_url TYPE TEXT
    `);
    
    console.log('✅ audio_url字段已成功修改为TEXT类型');
    
    // 验证修改
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'songs' AND column_name = 'audio_url'
    `);
    
    console.log('修改后的字段信息:', verifyResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  }
}

fixAudioUrlField();

