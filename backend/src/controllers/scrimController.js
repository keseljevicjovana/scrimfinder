const { Op } = require('sequelize');
const { ScrimZahtjev, ScrimMec, Tim, Korisnik, ClanTima, PrisustvoMeca } = require('../models');
const { posaljiNotifikaciju } = require('../utils/notify');
const { provjeriDostignucaZaKorisnika } = require('../utils/achievements');
const { nadjiPreklapanje } = require('../utils/kalendar');

async function provjeriDaJeKapiten(tim_id, korisnik_id) {
  const tim = await Tim.findByPk(tim_id);
  return tim && tim.kapiten_id === korisnik_id ? tim : null;
}

async function provjeriDaJeClan(tim_id, korisnik_id) {
  const tim = await Tim.findByPk(tim_id);
  if (!tim) return null;
  const clan = await ClanTima.findOne({ where: { tim_id, korisnik_id } });
  return clan ? tim : null;
}

exports.posaljiZahtjev = async (req, res) => {
  const { tim_posiljalac_id, tim_primalac_id, predlozeni_termin, broj_mapa, pravila } = req.body;
  // Bilo koji ČLAN tima može zakazati skrim u njegovo ime — ne samo kapiten (kapiten i dalje
  // jedini može PRIHVATITI/ODBITI dolazni zahtjev, jer to obavezuje cijeli tim).
  const tim = await provjeriDaJeClan(tim_posiljalac_id, req.korisnik.id);
  if (!tim) return res.status(403).json({ poruka: 'Morate biti član tima da biste slali scrim zahtjeve u njegovo ime.' });

  const sudar = await nadjiPreklapanje(tim_posiljalac_id, predlozeni_termin);
  if (sudar) {
    return res.status(400).json({ poruka: 'Vaš tim već ima zakazan meč u blizini tog termina. Izaberite drugo vrijeme.' });
  }

  const zahtjev = await ScrimZahtjev.create({ tim_posiljalac_id, tim_primalac_id, predlozeni_termin, broj_mapa, pravila });
  const primalac = await Tim.findByPk(tim_primalac_id);
  await posaljiNotifikaciju(primalac.kapiten_id, 'scrim_zahtjev_primljen', `Tim "${tim.naziv}" vam je poslao scrim zahtjev.`, 'scrim_zahtjev', zahtjev.id);
  res.status(201).json(zahtjev);
};

exports.odgovoriNaZahtjev = async (req, res) => {
  const { odgovor } = req.body; // 'prihvacen' | 'odbijen'
  const zahtjev = await ScrimZahtjev.findByPk(req.params.id, { include: [{ model: Tim, as: 'posiljalac' }, { model: Tim, as: 'primalac' }] });
  if (!zahtjev) return res.status(404).json({ poruka: 'Zahtjev nije pronađen.' });
  if (zahtjev.primalac.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten tima primaoca odgovara na zahtjev.' });

  let mec = null;
  if (odgovor === 'prihvacen') {
    // Tek sada se termin STVARNO rezerviše za oba tima — provjeri sudar za OBA tima.
    const sudarPosiljalac = await nadjiPreklapanje(zahtjev.tim_posiljalac_id, zahtjev.predlozeni_termin);
    const sudarPrimalac = await nadjiPreklapanje(zahtjev.tim_primalac_id, zahtjev.predlozeni_termin);
    if (sudarPosiljalac || sudarPrimalac) {
      return res.status(400).json({ poruka: 'Jedan od timova već ima zakazan meč u blizini tog termina. Ne može se prihvatiti bez izmjene termina.' });
    }

    zahtjev.status = odgovor;
    await zahtjev.save();

    mec = await ScrimMec.create({
      zahtjev_id: zahtjev.id,
      tim1_id: zahtjev.tim_posiljalac_id,
      tim2_id: zahtjev.tim_primalac_id,
      zakazano_za: zahtjev.predlozeni_termin,
    });

    // Svi članovi OBA tima dobijaju pitanje da li mogu prisustvovati.
    const clanovi = await ClanTima.findAll({ where: { tim_id: [zahtjev.tim_posiljalac_id, zahtjev.tim_primalac_id] } });
    const vecObradjeni = new Set(); // sprečava duplo pitanje ako je isti igrač član OBA tima (npr. igra za oba svoja tima)
    for (const c of clanovi) {
      if (vecObradjeni.has(c.korisnik_id)) continue;
      vecObradjeni.add(c.korisnik_id);
      await PrisustvoMeca.findOrCreate({
        where: { mec_id: mec.id, korisnik_id: c.korisnik_id },
        defaults: { mec_id: mec.id, korisnik_id: c.korisnik_id, tim_id: c.tim_id, status: 'na_cekanju' },
      });
      await posaljiNotifikaciju(c.korisnik_id, 'prisustvo_pitanje', `Možeš li prisustvovati meču zakazanom za ${new Date(mec.zakazano_za).toLocaleString('sr-RS')}?`, 'mec', mec.id);
    }
  } else {
    zahtjev.status = odgovor;
    await zahtjev.save();
  }

  await posaljiNotifikaciju(
    zahtjev.posiljalac.kapiten_id,
    odgovor === 'prihvacen' ? 'scrim_zahtjev_prihvacen' : 'scrim_zahtjev_odbijen',
    `Tim "${zahtjev.primalac.naziv}" je ${odgovor === 'prihvacen' ? 'prihvatio' : 'odbio'} vaš scrim zahtjev.`,
    mec ? 'mec' : null, mec ? mec.id : null,
  );
  res.json({ zahtjev, mec });
};

exports.mojiZahtjevi = async (req, res) => {
  const timovi = await Tim.findAll({ where: { kapiten_id: req.korisnik.id } });
  const timIds = timovi.map((t) => t.id);
  const primljeni = await ScrimZahtjev.findAll({ where: { tim_primalac_id: timIds }, include: [{ model: Tim, as: 'posiljalac' }, { model: Tim, as: 'primalac' }] });
  const poslati = await ScrimZahtjev.findAll({ where: { tim_posiljalac_id: timIds }, include: [{ model: Tim, as: 'posiljalac' }, { model: Tim, as: 'primalac' }] });
  res.json({ primljeni, poslati });
};

exports.dohvatiMec = async (req, res) => {
  const mec = await ScrimMec.findByPk(req.params.id, {
    include: [
      { model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }, { model: Tim, as: 'pobjednik' },
      { model: PrisustvoMeca, as: 'prisustva', include: [{ model: Korisnik, attributes: ['id', 'ime', 'avatar', 'pol'] }] },
    ],
  });
  if (!mec) return res.status(404).json({ poruka: 'Meč nije pronađen.' });
  res.json(mec);
};

// Kapiten glasa o ishodu meča iz SVOJE perspektive: 'pobjeda' | 'poraz' | 'nerijeseno'.
// Kad oba kapitena glasaju, ako se slažu meč se automatski potvrđuje; ako se ne slažu, ide na 'sporno'.
exports.glasajZaRezultat = async (req, res) => {
  const { glas } = req.body;
  if (!['pobjeda', 'poraz', 'nerijeseno'].includes(glas)) {
    return res.status(400).json({ poruka: 'Nevažeći glas.' });
  }
  const mec = await ScrimMec.findByPk(req.params.id, { include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }] });
  if (!mec) return res.status(404).json({ poruka: 'Meč nije pronađen.' });
  if (new Date(mec.zakazano_za) > new Date()) {
    return res.status(400).json({ poruka: 'Meč se još nije odigrao — glasanje je moguće tek nakon zakazanog termina.' });
  }
  if (mec.status === 'odigran') return res.status(400).json({ poruka: 'Rezultat je već potvrđen.' });

  const jeTim1 = mec.tim1.kapiten_id === req.korisnik.id;
  const jeTim2 = mec.tim2.kapiten_id === req.korisnik.id;
  if (!jeTim1 && !jeTim2) return res.status(403).json({ poruka: 'Samo kapiteni ova dva tima glasaju o rezultatu.' });

  if (jeTim1) mec.glas_tim1 = glas;
  if (jeTim2) mec.glas_tim2 = glas;
  await mec.save();

  if (mec.glas_tim1 && mec.glas_tim2) {
    let ishod = null;
    if (mec.glas_tim1 === 'nerijeseno' && mec.glas_tim2 === 'nerijeseno') ishod = 'nerijeseno';
    else if (mec.glas_tim1 === 'pobjeda' && mec.glas_tim2 === 'poraz') ishod = 'tim1';
    else if (mec.glas_tim1 === 'poraz' && mec.glas_tim2 === 'pobjeda') ishod = 'tim2';

    if (ishod) {
      mec.ishod = ishod;
      mec.status = 'odigran';
      mec.pobjednik_tim_id = ishod === 'tim1' ? mec.tim1_id : ishod === 'tim2' ? mec.tim2_id : null;
      await mec.save();

      const prisustva = await PrisustvoMeca.findAll({ where: { mec_id: mec.id, status: 'moze' } });
      for (const p of prisustva) await provjeriDostignucaZaKorisnika(p.korisnik_id);
    } else {
      mec.status = 'sporno';
      await mec.save();
    }
  }

  res.json(mec);
};

// Admin ručno rješava sporni meč.
exports.rijesiSpor = async (req, res) => {
  const { ishod } = req.body; // 'tim1' | 'tim2' | 'nerijeseno'
  const mec = await ScrimMec.findByPk(req.params.id);
  if (!mec) return res.status(404).json({ poruka: 'Meč nije pronađen.' });
  mec.ishod = ishod;
  mec.status = 'odigran';
  mec.pobjednik_tim_id = ishod === 'tim1' ? mec.tim1_id : ishod === 'tim2' ? mec.tim2_id : null;
  await mec.save();

  const prisustva = await PrisustvoMeca.findAll({ where: { mec_id: mec.id, status: 'moze' } });
  for (const p of prisustva) await provjeriDostignucaZaKorisnika(p.korisnik_id);

  res.json(mec);
};

exports.listaSpornihMeceva = async (req, res) => {
  const mecevi = await ScrimMec.findAll({
    where: { status: 'sporno' },
    include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }],
    order: [['zakazano_za', 'DESC']],
  });
  res.json(mecevi);
};

// Igrač potvrđuje/odbija prisustvo zakazanom meču svog tima.
exports.azurirajPrisustvo = async (req, res) => {
  const { status } = req.body; // 'moze' | 'ne_moze'
  const prisustvo = await PrisustvoMeca.findOne({ where: { mec_id: req.params.id, korisnik_id: req.korisnik.id } });
  if (!prisustvo) return res.status(404).json({ poruka: 'Niste pozvani na ovaj meč.' });
  prisustvo.status = status;
  await prisustvo.save();
  res.json(prisustvo);
};

// Kalendar — svi zakazani mečevi timova čiji je korisnik član.
exports.mojKalendar = async (req, res) => {
  const clanstva = await ClanTima.findAll({ where: { korisnik_id: req.korisnik.id } });
  const timIds = clanstva.map((c) => c.tim_id);
  if (timIds.length === 0) return res.json([]);

  const mecevi = await ScrimMec.findAll({
    where: { [Op.or]: [{ tim1_id: timIds }, { tim2_id: timIds }] },
    include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }],
    order: [['zakazano_za', 'ASC']],
  });
  res.json(mecevi);
};
