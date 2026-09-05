const { Komentar, KomentarLajk, Korisnik, Tim, ScrimMec } = require('../models');
const { posaljiNotifikaciju } = require('../utils/notify');

exports.listaKomentara = async (req, res) => {
  const { entitet_tip, entitet_id } = req.params;
  const komentari = await Komentar.findAll({
    where: { entitet_tip, entitet_id },
    include: [
      { model: Korisnik, as: 'autor', attributes: ['id', 'ime', 'avatar', 'pol'] },
      { model: KomentarLajk, as: 'lajkovi' },
    ],
    order: [['created_at', 'DESC']],
  });
  res.json(komentari);
};

exports.dodajKomentar = async (req, res) => {
  const { entitet_tip, entitet_id } = req.params;
  const { tekst } = req.body;
  if (!tekst || !tekst.trim()) return res.status(400).json({ poruka: 'Komentar ne može biti prazan.' });

  const komentar = await Komentar.create({ entitet_tip, entitet_id, autor_id: req.korisnik.id, tekst });

  if (entitet_tip === 'tim') {
    const tim = await Tim.findByPk(entitet_id);
    if (tim && tim.kapiten_id !== req.korisnik.id) {
      await posaljiNotifikaciju(tim.kapiten_id, 'komentar_na_timu', `Novi komentar na profilu tima "${tim.naziv}".`, 'tim', tim.id);
    }
  }
  const rezultat = await Komentar.findByPk(komentar.id, { include: [{ model: Korisnik, as: 'autor', attributes: ['id', 'ime', 'avatar', 'pol'] }] });
  res.status(201).json(rezultat);
};

exports.obrisiKomentar = async (req, res) => {
  const komentar = await Komentar.findByPk(req.params.id);
  if (!komentar) return res.status(404).json({ poruka: 'Komentar nije pronađen.' });
  if (komentar.autor_id !== req.korisnik.id && req.korisnik.uloga !== 'admin') {
    return res.status(403).json({ poruka: 'Nemate dozvolu da obrišete ovaj komentar.' });
  }
  await komentar.destroy();
  res.json({ poruka: 'Komentar je obrisan.' });
};

exports.lajkujKomentar = async (req, res) => {
  const [lajk, kreiran] = await KomentarLajk.findOrCreate({
    where: { komentar_id: req.params.id, korisnik_id: req.korisnik.id },
  });
  if (!kreiran) {
    await lajk.destroy();
    return res.json({ poruka: 'Lajk je uklonjen.', lajkovano: false });
  }
  res.json({ poruka: 'Komentar je lajkovan.', lajkovano: true });
};
