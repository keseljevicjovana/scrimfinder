const router = require('express').Router();
const ctrl = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

router.get('/:entitet_tip/:entitet_id', ctrl.listaKomentara);
router.post('/:entitet_tip/:entitet_id', auth, ctrl.dodajKomentar);
router.delete('/:id', auth, ctrl.obrisiKomentar);
router.post('/:id/lajk', auth, ctrl.lajkujKomentar);

module.exports = router;
