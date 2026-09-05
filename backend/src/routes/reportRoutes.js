const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { auth, jeAdmin } = require('../middleware/auth');

router.post('/', auth, ctrl.napraviPrijavu);
router.get('/', auth, jeAdmin, ctrl.listaPrijava);
router.put('/:id/rijesi', auth, jeAdmin, ctrl.rijesiPrijavu);
router.put('/:id/ignorisi', auth, jeAdmin, ctrl.ignorisiPrijavu);
router.delete('/:id/sadrzaj', auth, jeAdmin, ctrl.obrisiPrijavljenSadrzaj);

module.exports = router;
