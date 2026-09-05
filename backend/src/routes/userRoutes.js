const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.get('/:id', ctrl.dohvatiProfil);
router.put('/profil', auth, ctrl.azurirajProfil);
router.put('/avatar', auth, ctrl.azurirajAvatar);
router.put('/dostupnost', auth, ctrl.postaviDostupnost);
router.put('/lozinka', auth, ctrl.promijeniLozinku);

module.exports = router;
