const { PrijavaSadrzaja, Korisnik, Komentar } = require('../models');

exports.napraviPrijavu = async (req, res) => {
  const { entitet_tip, entitet_id, razlog } = req.body;
  const prijava = await PrijavaSadrzaja.create({
    prijavio_korisnik_id: req.korisnik.id, entitet_tip, entitet_id, razlog,
  });
  res.status(201).json(prijava);
};

// Vraća prijave ZAJEDNO SA STVARNIM SADRŽAJEM na koji se odnose (tekst komentara i njegov
// autor, ili profil prijavljenog korisnika) — administrator mora moći da VIDI o čemu se radi
// prije nego što odluči šta da radi, ne samo da "slijepo" klikne dugme.
exports.listaPrijava = async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const prijave = await PrijavaSadrzaja.findAll({
    where,
    include: [
      { model: Korisnik, as: 'prijavio', attributes: ['id', 'ime'] },
      { model: Korisnik, as: 'rijesioAdmin', attributes: ['id', 'ime'] },
    ],
    order: [['created_at', 'DESC']],
  });

  const obogacene = await Promise.all(prijave.map(async (p) => {
    let sadrzaj = null;
    if (p.entitet_tip === 'komentar') {
      const komentar = await Komentar.findByPk(p.entitet_id, { include: [{ model: Korisnik, as: 'autor', attributes: ['id', 'ime'] }] });
      sadrzaj = komentar ? { tekst: komentar.tekst, autor: komentar.autor, obrisan: false } : { obrisan: true };
    } else if (p.entitet_tip === 'korisnik') {
      const korisnik = await Korisnik.findByPk(p.entitet_id, { attributes: ['id', 'ime', 'email'] });
      sadrzaj = korisnik ? { korisnik, obrisan: false } : { obrisan: true };
    }
    return { ...p.toJSON(), sadrzaj };
  }));

  res.json(obogacene);
};

exports.rijesiPrijavu = async (req, res) => {
  const prijava = await PrijavaSadrzaja.findByPk(req.params.id);
  if (!prijava) return res.status(404).json({ poruka: 'Prijava nije pronađena.' });
  await prijava.update({ status: 'rijeseno', rijesio_admin_id: req.korisnik.id });
  res.json(prijava);
};

// Admin odlučuje da prijava ne zahtijeva akciju — sadržaj ostaje, samo se prijava sklanja
// iz liste "na čekanju" (razlikuje se od "riješeno" radi jasne evidencije šta se stvarno desilo).
exports.ignorisiPrijavu = async (req, res) => {
  const prijava = await PrijavaSadrzaja.findByPk(req.params.id);
  if (!prijava) return res.status(404).json({ poruka: 'Prijava nije pronađena.' });
  await prijava.update({ status: 'ignorisano', rijesio_admin_id: req.korisnik.id });
  res.json(prijava);
};

// Admin briše prijavljeni komentar direktno iz prijave (samo za entitet_tip='komentar').
exports.obrisiPrijavljenSadrzaj = async (req, res) => {
  const prijava = await PrijavaSadrzaja.findByPk(req.params.id);
  if (!prijava) return res.status(404).json({ poruka: 'Prijava nije pronađena.' });
  if (prijava.entitet_tip === 'komentar') {
    await Komentar.destroy({ where: { id: prijava.entitet_id } });
  }
  await prijava.update({ status: 'rijeseno', rijesio_admin_id: req.korisnik.id });
  res.json({ poruka: 'Sadržaj je obrisan.', prijava });
};
