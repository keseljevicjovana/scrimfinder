const { Op } = require('sequelize');
const { Konverzacija, ClanKonverzacije, Poruka, Korisnik, Tim } = require('../models');
const { posaljiNotifikaciju } = require('../utils/notify');

// Vraća: prihvaćene konverzacije (timske + direktne) i zahtjeve (pending direktne poruke koje ČEKAJU na moj odgovor).
exports.mojeKonverzacije = async (req, res) => {
  const clanstva = await ClanKonverzacije.findAll({
    where: { korisnik_id: req.korisnik.id, status: { [Op.in]: ['prihvacena', 'na_cekanju'] } },
    include: [
      {
        model: Konverzacija,
        include: [
          { model: Tim, attributes: ['id', 'naziv', 'logo_url'] },
          { model: ClanKonverzacije, as: 'clanovi', include: [{ model: Korisnik, attributes: ['id', 'ime', 'avatar', 'pol'] }] },
        ],
      },
    ],
  });

  const rezultat = [];
  for (const c of clanstva) {
    const konv = c.Konverzacija;
    const drugiClanovi = konv.clanovi.filter((cl) => cl.korisnik_id !== req.korisnik.id);
    const poslednjaPoruka = await Poruka.findOne({ where: { konverzacija_id: konv.id }, order: [['created_at', 'DESC']] });
    const nepr = await Poruka.count({
      where: {
        konverzacija_id: konv.id,
        posiljalac_id: { [Op.ne]: req.korisnik.id },
        created_at: { [Op.gt]: c.poslednje_procitano_at || new Date(0) },
      },
    });
    rezultat.push({
      id: konv.id,
      tip: konv.tip,
      tim: konv.Tim || null,
      sagovornici: drugiClanovi.map((cl) => cl.Korisnik),
      mojStatus: c.status,
      pinovano: c.pinovano,
      poslednjaPoruka,
      nepr,
    });
  }

  // Timski chat je UVIJEK prvi (pinovan po definiciji) — direktne poruke se sortiraju po vremenu poslednje poruke.
  const prihvacene = rezultat.filter((r) => r.mojStatus === 'prihvacena')
    .sort((a, b) => (b.tip === 'tim') - (a.tip === 'tim') || new Date(b.poslednjaPoruka?.created_at || 0) - new Date(a.poslednjaPoruka?.created_at || 0));
  const zahtjevi = rezultat.filter((r) => r.mojStatus === 'na_cekanju');

  res.json({ prihvacene, zahtjevi, ukupnoNeprocitano: prihvacene.reduce((a, r) => a + r.nepr, 0) });
};

// Šalje direktnu poruku korisniku (pravi konverzaciju ako ne postoji).
exports.posaljiDirektnu = async (req, res) => {
  const { primalac_id, tekst } = req.body;
  if (!tekst || !tekst.trim()) return res.status(400).json({ poruka: 'Poruka ne može biti prazna.' });
  if (Number(primalac_id) === req.korisnik.id) return res.status(400).json({ poruka: 'Ne možete pisati sami sebi.' });

  // Nađi postojeću direktnu konverzaciju između ova dva korisnika
  const mojaClanstva = await ClanKonverzacije.findAll({
    where: { korisnik_id: req.korisnik.id },
    include: [{ model: Konverzacija, where: { tip: 'direktna' } }],
  });
  let konverzacija = null;
  for (const c of mojaClanstva) {
    const drugi = await ClanKonverzacije.findOne({ where: { konverzacija_id: c.konverzacija_id, korisnik_id: primalac_id } });
    if (drugi) { konverzacija = c.Konverzacija; break; }
  }

  if (!konverzacija) {
    konverzacija = await Konverzacija.create({ tip: 'direktna' });
    await ClanKonverzacije.create({ konverzacija_id: konverzacija.id, korisnik_id: req.korisnik.id, status: 'prihvacena', poslednje_procitano_at: new Date() });
    await ClanKonverzacije.create({ konverzacija_id: konverzacija.id, korisnik_id: primalac_id, status: 'na_cekanju' });
    await posaljiNotifikaciju(primalac_id, 'poruka_zahtjev', `${req.korisnik.ime} vam je poslao/la zahtjev za poruku.`, 'konverzacija', konverzacija.id);
  }

  const poruka = await Poruka.create({ konverzacija_id: konverzacija.id, posiljalac_id: req.korisnik.id, tekst });
  await ClanKonverzacije.update({ poslednje_procitano_at: new Date() }, { where: { konverzacija_id: konverzacija.id, korisnik_id: req.korisnik.id } });
  res.status(201).json({ konverzacija_id: konverzacija.id, poruka });
};

// Prihvati / odbij zahtjev za poruku
exports.odgovoriNaZahtjev = async (req, res) => {
  const { odgovor } = req.body; // 'prihvacena' | 'odbijena'
  const clanstvo = await ClanKonverzacije.findOne({ where: { konverzacija_id: req.params.id, korisnik_id: req.korisnik.id } });
  if (!clanstvo) return res.status(404).json({ poruka: 'Zahtjev nije pronađen.' });
  clanstvo.status = odgovor;
  if (odgovor === 'prihvacena') clanstvo.poslednje_procitano_at = new Date();
  await clanstvo.save();
  res.json({ poruka: 'Sačuvano.' });
};



// Poruke jedne konverzacije + označavanje pročitanim
exports.dohvatiPoruke = async (req, res) => {
  const clanstvo = await ClanKonverzacije.findOne({ where: { konverzacija_id: req.params.id, korisnik_id: req.korisnik.id } });
  if (!clanstvo || clanstvo.status === 'odbijena') return res.status(403).json({ poruka: 'Nemate pristup ovoj konverzaciji.' });

  const poruke = await Poruka.findAll({
    where: { konverzacija_id: req.params.id },
    include: [{ model: Korisnik, as: 'posiljalac', attributes: ['id', 'ime', 'avatar', 'pol'] }],
    order: [['created_at', 'ASC']],
    limit: 200,
  });
  if (clanstvo.status === 'prihvacena') {
    clanstvo.poslednje_procitano_at = new Date();
    await clanstvo.save();
  }
  res.json(poruke);
};

// Slanje poruke u postojeću konverzaciju (timski chat ili već prihvaćena direktna)
exports.posaljiUKonverzaciju = async (req, res) => {
  const { tekst } = req.body;
  if (!tekst || !tekst.trim()) return res.status(400).json({ poruka: 'Poruka ne može biti prazna.' });
  const clanstvo = await ClanKonverzacije.findOne({ where: { konverzacija_id: req.params.id, korisnik_id: req.korisnik.id } });
  if (!clanstvo || clanstvo.status === 'odbijena') return res.status(403).json({ poruka: 'Nemate pristup ovoj konverzaciji.' });

  const poruka = await Poruka.create({ konverzacija_id: req.params.id, posiljalac_id: req.korisnik.id, tekst });
  clanstvo.poslednje_procitano_at = new Date();
  await clanstvo.save();

  const rezultat = await Poruka.findByPk(poruka.id, { include: [{ model: Korisnik, as: 'posiljalac', attributes: ['id', 'ime', 'avatar', 'pol'] }] });
  res.status(201).json(rezultat);
};
