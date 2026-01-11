const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'gohoy',
  password: '040424',
  database: 'songs',
  max: 10,
});

module.exports = pool;
