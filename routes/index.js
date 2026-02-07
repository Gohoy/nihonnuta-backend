var express = require('express');
var router = express.Router();
const migrationController = require('../controllers/migration.controller');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* 数据库迁移 */
router.post('/migration/run', migrationController.runMigration);

module.exports = router;
