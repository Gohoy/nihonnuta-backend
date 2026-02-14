const express = require('express');
const router = express.Router();
const migrationController = require('../controllers/migration.controller');

router.post('/run', migrationController.runMigration);

module.exports = router;

