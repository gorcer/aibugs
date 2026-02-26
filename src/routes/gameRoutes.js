const express = require('express');
const router = express.Router();
const gameController = require('../controllers/GameController');

router.post('/addUnit', gameController.addUnit);
router.get('/watch/:unitUid', gameController.watch);
router.post('/action/:unitUid', gameController.action);
router.get('/feel/:unitUid', gameController.feel);
router.get('/memory/:unitUid', gameController.memory);

module.exports = router;
