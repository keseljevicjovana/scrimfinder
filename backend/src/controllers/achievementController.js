const { Op } = require('sequelize');
const { Dostignuce, KorisnikDostignuce, Korisnik, Tim, Igra, ClanTima, ScrimMec, PrisustvoMeca } = require('../models');
const { izracunajTimskuStatistiku } = require('../utils/rang');

exports.listaDostignuca = async (req, res) => {
  const dostignuca = await Dostignuce.findAll();
  res.json(dostignuca);
};

exports.napraviDostignuce = async (req, res) => {
  const { naziv, opis, uslov_tip, uslov_vrijednost } = req.body;
  const dostignuce = await Dostignuce.create({ naziv, opis, uslov_tip, uslov_vrijednost });
  res.status(201).json(dostignuce);
};

exports.obrisiDostignuce = async (req, res) => {
  await Dostignuce.destroy({ where: { id: req.params.id } });
  res.json({ poruka: 'Dostignuće je obrisano.' });
};

// Rangiranje TIMOVA po poenima (pobjede/nerešeno/niz pobjeda — vidi utils/rang.js).
exports.leaderboardTimovi = async (req, res) => {
  const { igra_id } = req.query;
  const timoviWhere = igra_id ? { igra_id } : {};
  const timovi = await Tim.findAll({ where: timoviWhere, include: [Igra] });
  const sviMecevi = await ScrimMec.findAll({ where: { status: 'odigran' } });

  const rezultat = timovi.map((t) => {
    const mecevi = sviMecevi.filter((m) => m.tim1_id === t.id || m.tim2_id === t.id);
    const stat = izracunajTimskuStatistiku(mecevi, t.id);
    return {
      tim: { id: t.id, naziv: t.naziv, logo_url: t.logo_url },
      igra: t.Igra?.naziv,
      ...stat,
    };
  }).filter((r) => r.odigranihMeceva > 0);

  rezultat.sort((a, b) => b.poeni - a.poeni);
  res.json(rezultat.slice(0, 50));
};

// Rangiranje IGRAČA po % prisustva mečevima (posvećenost), preko SVIH njihovih timova.
exports.leaderboardIgraci = async (req, res) => {
  const svi = await Korisnik.findAll({ where: { uloga: 'igrac' }, attributes: ['id', 'ime', 'avatar', 'pol'] });
  const rezultat = [];

  for (const k of svi) {
    const clanstva = await ClanTima.findAll({ where: { korisnik_id: k.id } });
    if (clanstva.length === 0) continue;
    const timIds = clanstva.map((c) => c.tim_id);

    const ukupnoOdigranih = await ScrimMec.count({
      where: { status: 'odigran', [Op.or]: [{ tim1_id: timIds }, { tim2_id: timIds }] },
    });
    if (ukupnoOdigranih === 0) continue;

    const prisustvovao = await PrisustvoMeca.count({
      where: { korisnik_id: k.id, status: 'moze' },
      include: [{ model: ScrimMec, where: { status: 'odigran' } }],
    });

    rezultat.push({
      korisnik: { id: k.id, ime: k.ime, avatar: k.avatar, pol: k.pol },
      brojTimova: clanstva.length,
      odigranoUkupno: ukupnoOdigranih,
      prisustvovao,
      postotakPrisustva: Math.round((prisustvovao / ukupnoOdigranih) * 100),
    });
  }

  rezultat.sort((a, b) => b.postotakPrisustva - a.postotakPrisustva || b.prisustvovao - a.prisustvovao);
  res.json(rezultat.slice(0, 50));
};
