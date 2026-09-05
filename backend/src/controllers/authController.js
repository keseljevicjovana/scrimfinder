const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Korisnik, ProfilIgraca, Igra, Pozicija } = require('../models');
const { generisiJednokratnuLozinku } = require('../utils/otp');
const { posaljiJednokratnuLozinku } = require('../utils/mail');
const { generisiNasumicniAvatar } = require('../utils/avatarOptions');

function napraviToken(korisnik) {
  return jwt.sign({ id: korisnik.id, uloga: korisnik.uloga }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function javniKorisnik(korisnik) {
  return {
    id: korisnik.id, ime: korisnik.ime, email: korisnik.email, uloga: korisnik.uloga,
    pol: korisnik.pol, avatar: korisnik.avatar, bio: korisnik.bio, mora_promijeniti_lozinku: korisnik.mora_promijeniti_lozinku,
  };
}

// Registracija: korisnik unosi ime, email, pol, opciono bio, i opciono VIŠE igara
// (svaka sa svojom pozicijom) — igrač realno može igrati više igara istovremeno.
// Lozinku NE bira sam — sistem generiše jednokratnu lozinku i šalje je na email.
// Nalog dobija nasumično dodijeljen avatar u skladu sa polom, koji kasnije može uređivati.
exports.registracija = async (req, res) => {
  try {
    const { ime, email, pol, bio, igre } = req.body;
    if (!ime || !email || !pol) {
      return res.status(400).json({ poruka: 'Ime, email i pol su obavezni.' });
    }
    const postoji = await Korisnik.findOne({ where: { email } });
    if (postoji) return res.status(409).json({ poruka: 'Korisnik sa ovim emailom već postoji.' });

    const jednokratnaLozinka = generisiJednokratnuLozinku();
    const lozinka_hash = await bcrypt.hash(jednokratnaLozinka, 10);
    const avatar = generisiNasumicniAvatar(pol);

    const korisnik = await Korisnik.create({
      ime, email, lozinka_hash, pol, avatar, bio: bio || null, mora_promijeniti_lozinku: true,
    });

    if (Array.isArray(igre)) {
      for (const i of igre) {
        if (!i.igra_id) continue;
        await ProfilIgraca.create({ korisnik_id: korisnik.id, igra_id: i.igra_id, pozicija_id: i.pozicija_id || null });
      }
    }

    await posaljiJednokratnuLozinku(email, ime, jednokratnaLozinka);

    res.status(201).json({
      poruka: 'Nalog je kreiran. Jednokratna lozinka je poslata na vaš email — prijavite se sa njom, a zatim je promijenite na stranici "Moj profil".',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ poruka: 'Greška prilikom registracije.' });
  }
};

exports.prijava = async (req, res) => {
  try {
    const { email, lozinka } = req.body;
    const korisnik = await Korisnik.findOne({ where: { email } });
    if (!korisnik) return res.status(401).json({ poruka: 'Pogrešan email ili lozinka.' });

    const ispravna = await bcrypt.compare(lozinka, korisnik.lozinka_hash);
    if (!ispravna) return res.status(401).json({ poruka: 'Pogrešan email ili lozinka.' });

    const token = napraviToken(korisnik);
    res.json({ token, korisnik: javniKorisnik(korisnik) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ poruka: 'Greška prilikom prijave.' });
  }
};

exports.trenutniKorisnik = async (req, res) => {
  const profili = await ProfilIgraca.findAll({
    where: { korisnik_id: req.korisnik.id },
    include: [Igra, Pozicija],
  });
  res.json({ korisnik: javniKorisnik(req.korisnik), profili });
};
