const express = require('express');
const router = express.Router();
const gameController = require('../controllers/GameController');
const auth = require('../middleware/auth');

router.post('/register', gameController.register);
router.post('/login', gameController.login);

// Защищенные маршруты
router.post('/addUnit', auth, gameController.addUnit);
router.post('/action/:unitUid', auth, gameController.action);
router.delete('/unit/:unitUid', auth, gameController.deleteUnit);

// Публичные маршруты
router.get('/watch/:unitUid', gameController.watch);
router.get('/feel/:unitUid', gameController.feel);
router.get('/memory/:unitUid', gameController.memory);
router.get('/worldStat', gameController.worldStat);

module.exports = router;
