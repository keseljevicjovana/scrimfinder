const router = require('express').Router();
const ctrl = require('../controllers/scrimController');
const { auth, jeAdmin } = require('../middleware/auth');

router.post('/zahtjevi', auth, ctrl.posaljiZahtjev);
router.put('/zahtjevi/:id', auth, ctrl.odgovoriNaZahtjev);
router.get('/zahtjevi/moji', auth, ctrl.mojiZahtjevi);

router.get('/kalendar/moj', auth, ctrl.mojKalendar);
router.get('/sporni/lista', auth, jeAdmin, ctrl.listaSpornihMeceva);

router.get('/mecevi/:id', ctrl.dohvatiMec);
router.put('/mecevi/:id/glasaj', auth, ctrl.glasajZaRezultat);
router.put('/mecevi/:id/rijesi-spor', auth, jeAdmin, ctrl.rijesiSpor);
router.put('/mecevi/:id/prisustvo', auth, ctrl.azurirajPrisustvo);

module.exports = router;
