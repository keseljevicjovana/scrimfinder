const jwt = require('jsonwebtoken');
const { Korisnik } = require('../models');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ poruka: 'Niste prijavljeni.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const korisnik = await Korisnik.findByPk(payload.id);
    if (!korisnik) return res.status(401).json({ poruka: 'Korisnik ne postoji.' });
    req.korisnik = korisnik;
    next();
  } catch (err) {
    return res.status(401).json({ poruka: 'Token nije validan ili je istekao.' });
  }
}

function jeAdmin(req, res, next) {
  if (req.korisnik.uloga !== 'admin') {
    return res.status(403).json({ poruka: 'Samo administrator ima pristup.' });
  }
  next();
}

module.exports = { auth, jeAdmin };
