const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { auth, jeAdmin } = require('../middleware/auth');

router.use(auth, jeAdmin);
router.get('/dashboard', ctrl.dashboard);
router.get('/korisnici', ctrl.listaKorisnika);
router.delete('/korisnici/:id', ctrl.obrisiKorisnika);
router.delete('/timovi/:id', ctrl.obrisiTim);

module.exports = router;
