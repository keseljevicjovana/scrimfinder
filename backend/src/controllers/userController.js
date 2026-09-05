const { Op } = require('sequelize');
const {
  Korisnik, ProfilIgraca, Igra, Pozicija, Dostupnost, Tim, ClanTima,
  ScrimMec, PrisustvoMeca, Dostignuce, KorisnikDostignuce,
} = require('../models');
const bcrypt = require('bcryptjs');
const { izracunajTimskuStatistiku } = require('../utils/rang');

// Individualna K/D/A statistika i lični rank su uklonjeni — profil sada prikazuje SVE timove
// igrača (jedan igrač može igrati više različitih igara u različitim timovima), za svaki
// tim njegov rank (izračunat iz mečeva) i njegovu ulogu, plus ukupan % prisustva kao mjeru posvećenosti.
exports.dohvatiProfil = async (req, res) => {
  const korisnik = await Korisnik.findByPk(req.params.id, { attributes: { exclude: ['lozinka_hash'] } });
  if (!korisnik) return res.status(404).json({ poruka: 'Korisnik nije pronađen.' });

  const profil = await ProfilIgraca.findOne({ where: { korisnik_id: korisnik.id }, include: [Igra, Pozicija] });
  const dostupnost = await Dostupnost.findAll({ where: { korisnik_id: korisnik.id } });
  const clanstva = await ClanTima.findAll({ where: { korisnik_id: korisnik.id }, include: [{ model: Tim, include: [Igra] }, Pozicija] });

  const timovi = [];
  let ukupnoOdigranih = 0;
  let ukupnoPrisustvovao = 0;

  for (const c of clanstva) {
    const tim = c.Tim;
    if (!tim) continue;
    const mecevi = await ScrimMec.findAll({
      where: { status: 'odigran', [Op.or]: [{ tim1_id: tim.id }, { tim2_id: tim.id }] },
    });
    const stat = izracunajTimskuStatistiku(mecevi, tim.id);
    const prisustvovao = await PrisustvoMeca.count({
      where: { korisnik_id: korisnik.id, tim_id: tim.id, status: 'moze' },
      include: [{ model: ScrimMec, where: { status: 'odigran' } }],
    });
    ukupnoOdigranih += stat.odigranihMeceva;
    ukupnoPrisustvovao += prisustvovao;

    timovi.push({
      tim: { id: tim.id, naziv: tim.naziv, logo_url: tim.logo_url, igra: tim.Igra?.naziv },
      uloga: tim.kapiten_id === korisnik.id ? 'Kapiten' : 'Član',
      pozicija: c.Pozicija ? c.Pozicija.naziv : null,
      rank: stat.rank,
      poeni: stat.poeni,
      odigranihMeceva: stat.odigranihMeceva,
      prisustvovao,
    });
  }

  const postotakPrisustva = ukupnoOdigranih > 0 ? Math.round((ukupnoPrisustvovao / ukupnoOdigranih) * 100) : null;

  const dostignuca = await KorisnikDostignuce.findAll({ where: { korisnik_id: korisnik.id }, include: [Dostignuce] });

  res.json({
    korisnik, profil, dostupnost,
    timovi,
    postotakPrisustva,
    dostignuca: dostignuca.map((d) => d.Dostignuce),
  });
};

exports.azurirajProfil = async (req, res) => {
  const { igra_id, pozicija_id, bio, ime } = req.body;
  if (ime) {
    await Korisnik.update({ ime }, { where: { id: req.korisnik.id } });
  }
  const [profil] = await ProfilIgraca.findOrCreate({ where: { korisnik_id: req.korisnik.id }, defaults: { igra_id } });
  await profil.update({ igra_id, pozicija_id, bio });
  res.json({ poruka: 'Profil je ažuriran.', profil });
};

// Ažuriranje izgleda avatara — korisnik bira kožu, oči, frizuru, boju kose, odjeću i dodatak.
// Validacija je namjerno blaga (samo provjera da su vrijednosti stringovi) — kompletna lista
// dozvoljenih opcija se održava na frontendu (frontend/src/avatarOptions.js) radi lakšeg širenja.
exports.azurirajAvatar = async (req, res) => {
  const { koza, oci, boja_kose, frizura, odjeca, dodatak } = req.body;
  const avatar = { koza, oci, boja_kose, frizura, odjeca, dodatak: dodatak || 'nista' };
  const nedostaje = Object.entries(avatar).some(([kljuc, v]) => kljuc !== 'dodatak' && !v);
  if (nedostaje) return res.status(400).json({ poruka: 'Sve stavke avatara (osim dodatka) su obavezne.' });

  await req.korisnik.update({ avatar });
  res.json({ poruka: 'Avatar je ažuriran.', avatar });
};

exports.postaviDostupnost = async (req, res) => {
  // ocekuje niz: [{dan_u_sedmici, vrijeme_od, vrijeme_do}, ...] - zamjenjuje postojecu dostupnost
  const { termini } = req.body;
  await Dostupnost.destroy({ where: { korisnik_id: req.korisnik.id } });
  const novi = await Promise.all(
    (termini || []).map((t) => Dostupnost.create({ ...t, korisnik_id: req.korisnik.id }))
  );
  res.json({ poruka: 'Dostupnost je ažurirana.', dostupnost: novi });
};

exports.promijeniLozinku = async (req, res) => {
  const { staraLozinka, novaLozinka, potvrdaNoveLozinke } = req.body;
  if (!novaLozinka || novaLozinka.length < 6) {
    return res.status(400).json({ poruka: 'Nova lozinka mora imati najmanje 6 karaktera.' });
  }
  if (potvrdaNoveLozinke !== undefined && novaLozinka !== potvrdaNoveLozinke) {
    return res.status(400).json({ poruka: 'Nova lozinka i potvrda lozinke se ne poklapaju.' });
  }
  const ok = await bcrypt.compare(staraLozinka, req.korisnik.lozinka_hash);
  if (!ok) return res.status(400).json({ poruka: 'Stara (ili jednokratna) lozinka nije tačna.' });

  const lozinka_hash = await bcrypt.hash(novaLozinka, 10);
  await req.korisnik.update({ lozinka_hash, mora_promijeniti_lozinku: false });
  res.json({ poruka: 'Lozinka je promijenjena.' });
};
