const express = require('express');
const router = express.Router();
const gameController = require('../controllers/GameController');
const auth = require('../middleware/auth');

router.post('/register', gameController.register);

// Защищенные маршруты
router.post('/addUnit', auth, gameController.addUnit);
router.get('/watch/:unitUid', auth, gameController.watch);
router.post('/action/:unitUid', auth, gameController.action);
router.get('/feel/:unitUid', auth, gameController.feel);
router.get('/memory/:unitUid', auth, gameController.memory);
router.delete('/unit/:unitUid', auth, gameController.deleteUnit);

// Публичные маршруты
router.get('/worldStat', gameController.worldStat);

module.exports = router;
