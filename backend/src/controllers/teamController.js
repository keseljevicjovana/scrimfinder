const { Op } = require('sequelize');
const {
  Tim, Igra, Korisnik, ClanTima, Pozicija, Pozivnica, Aplikacija, Dostupnost, ScrimMec, PrisustvoMeca,
} = require('../models');
const { posaljiNotifikaciju } = require('../utils/notify');
const { dodajUTimskiChat, ukloniIzTimskogChata } = require('../utils/chat');
const { izracunajTimskuStatistiku, rankZaPoene, PRAGOVI } = require('../utils/rang');

const RANK_VRIJEDNOST = PRAGOVI.reduce((acc, p, i) => ({ ...acc, [p.rank]: i + 1 }), {});

// Postotak prisustva jednog korisnika JEDNOM timu: (mečevi kojima je prisustvovao) / (mečevi na koje je POZVAN — ima sopstveni prisustvo-zapis).
// Namjerno se NE poredi sa "svim odigranim mečevima tima" — ako je igrač tek naknadno pridružen timu, nema smisla da ga se tereti za mečeve prije njegovog dolaska.
async function postotakPrisustvaZaTim(korisnik_id, tim_id) {
  const pozvanNa = await PrisustvoMeca.count({
    where: { korisnik_id, tim_id },
    include: [{ model: ScrimMec, where: { status: 'odigran' } }],
  });
  if (pozvanNa === 0) return 0;
  const prisustvovao = await PrisustvoMeca.count({
    where: { korisnik_id, tim_id, status: 'moze' },
    include: [{ model: ScrimMec, where: { status: 'odigran' } }],
  });
  return Math.min(100, Math.round((prisustvovao / pozvanNa) * 100));
}

exports.napraviTim = async (req, res) => {
  const { naziv, igra_id, opis, logo_url } = req.body;
  const postoji = await Tim.findOne({ where: { naziv } });
  if (postoji) return res.status(409).json({ poruka: 'Tim sa ovim nazivom već postoji.' });

  const tim = await Tim.create({ naziv, igra_id, opis, logo_url, kapiten_id: req.korisnik.id });
  await ClanTima.create({ tim_id: tim.id, korisnik_id: req.korisnik.id });
  await dodajUTimskiChat(tim.id, req.korisnik.id);
  res.status(201).json(tim);
};

exports.dohvatiTim = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id, {
    include: [
      Igra,
      { model: Korisnik, as: 'kapiten', attributes: ['id', 'ime', 'avatar', 'pol'] },
      { model: ClanTima, as: 'clanovi', include: [{ model: Korisnik, attributes: ['id', 'ime', 'avatar', 'pol'] }, Pozicija] },
    ],
  });
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  res.json(tim);
};

// Statistika tima (poeni, rank, niz pobjeda...) + istorija odigranih mečeva — koristi Home dashboard i profil tima.
exports.statistikaTima = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });

  const mecevi = await ScrimMec.findAll({
    where: { status: 'odigran', [Op.or]: [{ tim1_id: tim.id }, { tim2_id: tim.id }] },
    include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }],
    order: [['zakazano_za', 'DESC']],
  });

  const stat = izracunajTimskuStatistiku(mecevi, tim.id);

  const istorija = mecevi.slice(0, 10).map((m) => {
    const protivnik = m.tim1_id === tim.id ? m.tim2 : m.tim1;
    const pobijedio = (m.ishod === 'tim1' && m.tim1_id === tim.id) || (m.ishod === 'tim2' && m.tim2_id === tim.id);
    return {
      mec_id: m.id,
      protivnik: protivnik ? { id: protivnik.id, naziv: protivnik.naziv } : null,
      datum: m.zakazano_za,
      ishod: m.ishod === 'nerijeseno' ? 'nerijeseno' : (pobijedio ? 'pobjeda' : 'poraz'),
    };
  });

  res.json({ ...stat, istorija });
};

// Svi timovi trenutnog korisnika, sortirani: prvo timovi gdje je kapiten, pa po % prisustva (aktivnosti) opadajuće.
exports.mojiTimovi = async (req, res) => {
  const clanstva = await ClanTima.findAll({
    where: { korisnik_id: req.korisnik.id },
    include: [{ model: Tim, include: [Igra] }],
  });

  const rezultat = [];
  for (const c of clanstva) {
    const tim = c.Tim;
    if (!tim) continue;
    const jeKapiten = tim.kapiten_id === req.korisnik.id;
    const postotakAktivnosti = await postotakPrisustvaZaTim(req.korisnik.id, tim.id);
    const mecevi = await ScrimMec.findAll({
      where: { status: 'odigran', [Op.or]: [{ tim1_id: tim.id }, { tim2_id: tim.id }] },
    });
    const stat = izracunajTimskuStatistiku(mecevi, tim.id);
    rezultat.push({ tim, jeKapiten, postotakAktivnosti, rank: stat.rank, poeni: stat.poeni, trenutniNiz: stat.trenutniNiz });
  }

  rezultat.sort((a, b) => (b.jeKapiten - a.jeKapiten) || (b.postotakAktivnosti - a.postotakAktivnosti));
  res.json(rezultat);
};

exports.azurirajTim = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  if (tim.kapiten_id !== req.korisnik.id && req.korisnik.uloga !== 'admin') {
    return res.status(403).json({ poruka: 'Samo kapiten može uređivati tim.' });
  }
  const { naziv, opis, logo_url, trazi_igrace, grb } = req.body;
  await tim.update({ naziv, opis, logo_url, trazi_igrace, grb });
  res.json(tim);
};

// Kapiten uređuje SAMO grb tima (koristi se iz jednostavnog editora, analognog editoru avatara igrača).
exports.azurirajGrb = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  if (tim.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten može uređivati grb tima.' });
  await tim.update({ grb: req.body.grb });
  res.json({ grb: tim.grb });
};

exports.ukloniClana = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  if (tim.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten može uklanjati igrače.' });
  if (Number(req.params.korisnikId) === tim.kapiten_id) {
    return res.status(400).json({ poruka: 'Kapiten ne može ukloniti sam sebe.' });
  }
  await ClanTima.destroy({ where: { tim_id: tim.id, korisnik_id: req.params.korisnikId } });
  await ukloniIzTimskogChata(tim.id, req.params.korisnikId);
  res.json({ poruka: 'Igrač je uklonjen iz tima.' });
};

// ---- Pozivnice (kapiten -> igrac) ----
exports.posaljiPozivnicu = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  if (tim.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten šalje pozivnice.' });

  const { korisnik_id } = req.body;
  const pozivnica = await Pozivnica.create({ tim_id: tim.id, pozvani_korisnik_id: korisnik_id, poslao_korisnik_id: req.korisnik.id });
  await posaljiNotifikaciju(korisnik_id, 'pozivnica_u_tim', `Pozvani ste da se pridružite timu "${tim.naziv}".`, 'tim', tim.id);
  res.status(201).json(pozivnica);
};

exports.odgovoriNaPozivnicu = async (req, res) => {
  const { odgovor } = req.body; // 'prihvacena' | 'odbijena'
  const pozivnica = await Pozivnica.findByPk(req.params.id);
  if (!pozivnica) return res.status(404).json({ poruka: 'Pozivnica nije pronađena.' });
  if (pozivnica.pozvani_korisnik_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Ovo nije vaša pozivnica.' });

  pozivnica.status = odgovor;
  await pozivnica.save();
  if (odgovor === 'prihvacena') {
    await ClanTima.findOrCreate({ where: { tim_id: pozivnica.tim_id, korisnik_id: req.korisnik.id } });
    await dodajUTimskiChat(pozivnica.tim_id, req.korisnik.id);
  }
  res.json(pozivnica);
};

// ---- Aplikacije (igrac -> tim) ----
exports.posaljiAplikaciju = async (req, res) => {
  const tim = await Tim.findByPk(req.params.id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  const aplikacija = await Aplikacija.create({ tim_id: tim.id, korisnik_id: req.korisnik.id, poruka: req.body.poruka });
  await posaljiNotifikaciju(tim.kapiten_id, 'pozivnica_u_tim', `Novi zahtjev za pridruživanje timu "${tim.naziv}".`, 'tim', tim.id);
  res.status(201).json(aplikacija);
};

exports.odgovoriNaAplikaciju = async (req, res) => {
  const { odgovor } = req.body;
  const aplikacija = await Aplikacija.findByPk(req.params.id, { include: [Tim] });
  if (!aplikacija) return res.status(404).json({ poruka: 'Aplikacija nije pronađena.' });
  if (aplikacija.Tim.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten odlučuje o aplikacijama.' });

  aplikacija.status = odgovor;
  await aplikacija.save();
  if (odgovor === 'prihvacena') {
    await ClanTima.findOrCreate({ where: { tim_id: aplikacija.tim_id, korisnik_id: aplikacija.korisnik_id } });
    await dodajUTimskiChat(aplikacija.tim_id, aplikacija.korisnik_id);
  }
  await posaljiNotifikaciju(
    aplikacija.korisnik_id,
    odgovor === 'prihvacena' ? 'aplikacija_prihvacena' : 'aplikacija_odbijena',
    `Vaša aplikacija za tim "${aplikacija.Tim.naziv}" je ${odgovor === 'prihvacena' ? 'prihvaćena' : 'odbijena'}.`,
    'tim', aplikacija.tim_id,
  );
  res.json(aplikacija);
};

// ---- Pretraga ----
exports.brzaPretraga = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ timovi: [], igraci: [] });
  const timovi = await Tim.findAll({ where: { naziv: { [Op.like]: `%${q}%` } }, include: [Igra], limit: 10 });
  const igraci = await Korisnik.findAll({
    where: { ime: { [Op.like]: `%${q}%` } },
    attributes: ['id', 'ime', 'avatar', 'pol'],
    limit: 10,
  });
  res.json({ timovi, igraci });
};

exports.detaljnaPretraga = async (req, res) => {
  const { igra_id, rank_min, rank_max, min_clanova, trazi_igrace, dan, vrijeme } = req.query;
  const where = {};
  if (igra_id) where.igra_id = igra_id;
  if (trazi_igrace === 'true') where.trazi_igrace = true;

  let timovi = await Tim.findAll({
    where,
    include: [
      Igra,
      { model: ClanTima, as: 'clanovi', include: [{ model: Korisnik, attributes: ['id', 'ime'] }] },
    ],
  });

  if (min_clanova) timovi = timovi.filter((t) => t.clanovi.length >= Number(min_clanova));

  // Rank tima se računa iz mečeva (poenski sistem), ne bira se ručno — filtriramo po izračunatom rangu.
  if (rank_min || rank_max) {
    const min = RANK_VRIJEDNOST[rank_min] || 1;
    const max = RANK_VRIJEDNOST[rank_max] || 6;
    const svi = await ScrimMec.findAll({ where: { status: 'odigran' } });
    timovi = timovi.filter((t) => {
      const mecevi = svi.filter((m) => m.tim1_id === t.id || m.tim2_id === t.id);
      const stat = izracunajTimskuStatistiku(mecevi, t.id);
      const vrijednost = RANK_VRIJEDNOST[stat.rank];
      return vrijednost >= min && vrijednost <= max;
    });
  }

  if (dan !== undefined) {
    const clanoviIds = new Set();
    const svaDostupnost = await Dostupnost.findAll({ where: { dan_u_sedmici: dan } });
    svaDostupnost.forEach((d) => {
      if (!vrijeme || (d.vrijeme_od <= vrijeme && d.vrijeme_do >= vrijeme)) clanoviIds.add(d.korisnik_id);
    });
    timovi = timovi.filter((t) => t.clanovi.some((c) => clanoviIds.has(c.korisnik_id)));
  }

  res.json(timovi);
};
