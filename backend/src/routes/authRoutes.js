const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/registracija', ctrl.registracija);
router.post('/prijava', ctrl.prijava);
router.get('/ja', auth, ctrl.trenutniKorisnik);

module.exports = router;
