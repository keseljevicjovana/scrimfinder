const router = require('express').Router();
const ctrl = require('../controllers/achievementController');
const { auth, jeAdmin } = require('../middleware/auth');

router.get('/', ctrl.listaDostignuca);
router.post('/', auth, jeAdmin, ctrl.napraviDostignuce);
router.delete('/:id', auth, jeAdmin, ctrl.obrisiDostignuce);
router.get('/rangiranje/timovi', ctrl.leaderboardTimovi);
router.get('/rangiranje/igraci', ctrl.leaderboardIgraci);

module.exports = router;
