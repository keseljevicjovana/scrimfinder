const { Korisnik, Tim, ScrimMec, Turnir, PrijavaSadrzaja, Komentar } = require('../models');

exports.dashboard = async (req, res) => {
  const [brojKorisnika, brojTimova, brojMeceva, brojTurnira, prijaveNaCekanju, sporniMecevi] = await Promise.all([
    Korisnik.count(),
    Tim.count(),
    ScrimMec.count(),
    Turnir.count(),
    PrijavaSadrzaja.count({ where: { status: 'na_cekanju' } }),
    ScrimMec.count({ where: { status: 'sporno' } }),
  ]);
  res.json({ brojKorisnika, brojTimova, brojMeceva, brojTurnira, prijaveNaCekanju, sporniMecevi });
};

exports.listaKorisnika = async (req, res) => {
  const korisnici = await Korisnik.findAll({ attributes: { exclude: ['lozinka_hash'] }, order: [['created_at', 'DESC']] });
  res.json(korisnici);
};

exports.obrisiKorisnika = async (req, res) => {
  if (Number(req.params.id) === req.korisnik.id) return res.status(400).json({ poruka: 'Ne možete obrisati sami sebe.' });
  await Korisnik.destroy({ where: { id: req.params.id } });
  res.json({ poruka: 'Korisnik je obrisan.' });
};

exports.obrisiTim = async (req, res) => {
  await Tim.destroy({ where: { id: req.params.id } });
  res.json({ poruka: 'Tim je obrisan.' });
};
