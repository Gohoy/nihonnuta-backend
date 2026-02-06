const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: Number(process.env.PG_PORT || 5432),
  user: process.env.PG_USER || "gohoy",
  password: process.env.PG_PASSWORD || "040424",
  database: process.env.PG_DATABASE || "songs",
  max: Number(process.env.PG_POOL_MAX || 10),
});

module.exports = pool;
