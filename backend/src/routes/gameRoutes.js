const router = require('express').Router();
const ctrl = require('../controllers/gameController');
const { auth, jeAdmin } = require('../middleware/auth');

router.get('/', ctrl.listaIgara);
router.post('/', auth, jeAdmin, ctrl.napraviIgru);

module.exports = router;
