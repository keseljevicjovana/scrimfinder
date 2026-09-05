const router = require('express').Router();
const ctrl = require('../controllers/tournamentController');
const { auth, jeAdmin } = require('../middleware/auth');

router.get('/', ctrl.listaTurnira);
router.post('/', auth, jeAdmin, ctrl.napraviTurnir);
router.get('/:id', ctrl.dohvatiTurnir);
router.post('/:id/prijava', auth, ctrl.prijaviTim);
router.post('/:id/bracket', auth, jeAdmin, ctrl.generisiBracket);
router.put('/bracket/:slotId/rezultat', auth, ctrl.unesiRezultatBracketa);

module.exports = router;
