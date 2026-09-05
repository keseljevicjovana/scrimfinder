const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/konverzacije', ctrl.mojeKonverzacije);
router.post('/direktna', ctrl.posaljiDirektnu);
router.put('/konverzacije/:id/odgovor', ctrl.odgovoriNaZahtjev);
router.get('/konverzacije/:id/poruke', ctrl.dohvatiPoruke);
router.post('/konverzacije/:id/poruke', ctrl.posaljiUKonverzaciju);

module.exports = router;
