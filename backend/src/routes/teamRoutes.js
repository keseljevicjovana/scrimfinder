const router = require('express').Router();
const ctrl = require('../controllers/teamController');
const { auth } = require('../middleware/auth');

router.get('/pretraga/brza', ctrl.brzaPretraga);
router.get('/pretraga/detaljna', ctrl.detaljnaPretraga);
router.get('/moji/lista', auth, ctrl.mojiTimovi);
router.get('/pozivnice/moje', auth, ctrl.mojePozivnice);
router.get('/aplikacije/moje', auth, ctrl.mojeAplikacije);

router.post('/', auth, ctrl.napraviTim);
router.get('/:id', ctrl.dohvatiTim);
router.get('/:id/statistike', ctrl.statistikaTima);
router.put('/:id', auth, ctrl.azurirajTim);
router.put('/:id/grb', auth, ctrl.azurirajGrb);
router.delete('/:id/clanovi/:korisnikId', auth, ctrl.ukloniClana);
router.post('/:id/napusti', auth, ctrl.napustiTim);

router.post('/:id/pozivnice', auth, ctrl.posaljiPozivnicu);
router.post('/:id/aplikacije', auth, ctrl.posaljiAplikaciju);
router.put('/pozivnice/:id', auth, ctrl.odgovoriNaPozivnicu);
router.put('/aplikacije/:id', auth, ctrl.odgovoriNaAplikaciju);

module.exports = router;
