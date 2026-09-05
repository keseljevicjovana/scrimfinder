const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.mojeNotifikacije);
router.put('/:id/procitano', auth, ctrl.oznaciProcitano);
router.put('/procitano/sve', auth, ctrl.oznaciSveProcitano);

module.exports = router;
