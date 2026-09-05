const { Turnir, TurnirPrijava, RasporedTurnira, Tim, ScrimMec, Igra, KorisnikDostignuce, Dostignuce, ClanTima } = require('../models');
const { posaljiNotifikaciju } = require('../utils/notify');

exports.napraviTurnir = async (req, res) => {
  const { naziv, igra_id, datum, max_timova, format } = req.body;
  const turnir = await Turnir.create({ naziv, igra_id, datum, max_timova, format });
  res.status(201).json(turnir);
};

exports.listaTurnira = async (req, res) => {
  const turniri = await Turnir.findAll({ include: [Igra], order: [['datum', 'ASC']] });
  res.json(turniri);
};

exports.dohvatiTurnir = async (req, res) => {
  const turnir = await Turnir.findByPk(req.params.id, {
    include: [
      Igra,
      { model: TurnirPrijava, include: [Tim] },
      { model: RasporedTurnira, as: 'bracket', include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }, ScrimMec] },
    ],
  });
  if (!turnir) return res.status(404).json({ poruka: 'Turnir nije pronađen.' });
  res.json(turnir);
};

exports.prijaviTim = async (req, res) => {
  const { tim_id } = req.body;
  const turnir = await Turnir.findByPk(req.params.id);
  if (!turnir) return res.status(404).json({ poruka: 'Turnir nije pronađen.' });
  if (turnir.status !== 'prijave_otvorene') return res.status(400).json({ poruka: 'Prijave za ovaj turnir su zatvorene.' });

  const tim = await Tim.findByPk(tim_id);
  if (!tim) return res.status(404).json({ poruka: 'Tim nije pronađen.' });
  if (tim.kapiten_id !== req.korisnik.id) return res.status(403).json({ poruka: 'Samo kapiten prijavljuje tim na turnir.' });

  const trenutnoPrijavljenih = await TurnirPrijava.count({ where: { turnir_id: turnir.id } });
  if (trenutnoPrijavljenih >= turnir.max_timova) {
    return res.status(400).json({ poruka: 'Turnir je popunjen.' });
  }

  const prijava = await TurnirPrijava.findOrCreate({ where: { turnir_id: turnir.id, tim_id } });
  res.status(201).json(prijava[0]);
};

// Generiše single-elimination bracket iz prijavljenih timova.
// Ako broj timova nije stepen dvojke, upražnjeni slotovi (bye) automatski
// "prolaze" tim dalje u sledeću rundu.
exports.generisiBracket = async (req, res) => {
  const turnir = await Turnir.findByPk(req.params.id, { include: [{ model: TurnirPrijava, include: [Tim] }] });
  if (!turnir) return res.status(404).json({ poruka: 'Turnir nije pronađen.' });

  const postojeciBracket = await RasporedTurnira.count({ where: { turnir_id: turnir.id } });
  if (postojeciBracket > 0) return res.status(400).json({ poruka: 'Bracket je već generisan za ovaj turnir.' });

  let timovi = turnir.TurnirPrijavas ? turnir.TurnirPrijavas.map((p) => p.Tim) : (await TurnirPrijava.findAll({ where: { turnir_id: turnir.id }, include: [Tim] })).map((p) => p.Tim);
  if (timovi.length < 2) return res.status(400).json({ poruka: 'Potrebno je najmanje 2 prijavljena tima.' });

  // izmiješaj timove nasumično (seed)
  timovi = timovi.sort(() => Math.random() - 0.5);

  // zaokruži na sledeći stepen dvojke (dopuni sa "bye" slotovima = null)
  let velicinaBracketa = 2;
  while (velicinaBracketa < timovi.length) velicinaBracketa *= 2;
  while (timovi.length < velicinaBracketa) timovi.push(null);

  const brojRundi = Math.log2(velicinaBracketa);

  // napravi sve slotove za sve runde (runda 1 = prva runda), povezujuci sledeci_slot_id
  const rundeSlotovi = []; // rundeSlotovi[runda-1] = [slot, slot, ...]
  for (let runda = 1; runda <= brojRundi; runda++) {
    const brojMeceva = velicinaBracketa / Math.pow(2, runda);
    const slotovi = [];
    for (let pozicija = 1; pozicija <= brojMeceva; pozicija++) {
      const slot = await RasporedTurnira.create({ turnir_id: turnir.id, runda_broj: runda, pozicija_u_rundi: pozicija });
      slotovi.push(slot);
    }
    rundeSlotovi.push(slotovi);
  }

  // poveži sledeci_slot_id (pobjednik ide u slot ceil(pozicija/2) sledece runde)
  for (let runda = 0; runda < brojRundi - 1; runda++) {
    for (const slot of rundeSlotovi[runda]) {
      const sledecaPozicija = Math.ceil(slot.pozicija_u_rundi / 2);
      const sledeciSlot = rundeSlotovi[runda + 1][sledecaPozicija - 1];
      await slot.update({ sledeci_slot_id: sledeciSlot.id });
    }
  }

  // popuni prvu rundu timovima
  const prvaRunda = rundeSlotovi[0];
  for (let i = 0; i < prvaRunda.length; i++) {
    const tim1 = timovi[i * 2];
    const tim2 = timovi[i * 2 + 1];
    await prvaRunda[i].update({ tim1_id: tim1 ? tim1.id : null, tim2_id: tim2 ? tim2.id : null });
  }

  // automatski provuci "bye" (prazan protivnik) u sledeću rundu
  for (const slot of prvaRunda) {
    await eventualnoProguraiBye(slot);
  }

  await turnir.update({ status: 'u_toku' });
  const rezultat = await Turnir.findByPk(turnir.id, {
    include: [{ model: RasporedTurnira, as: 'bracket', include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }] }],
  });
  res.status(201).json(rezultat);
};

async function eventualnoProguraiBye(slot) {
  const imaBye = (slot.tim1_id && !slot.tim2_id) || (!slot.tim1_id && slot.tim2_id);
  if (!imaBye || !slot.sledeci_slot_id) return;
  const pobjednikId = slot.tim1_id || slot.tim2_id;
  const sledeciSlot = await RasporedTurnira.findByPk(slot.sledeci_slot_id);
  if (!sledeciSlot) return;
  const jeParan = slot.pozicija_u_rundi % 2 === 1; // neparna pozicija -> tim1 u sledecem slotu, parna -> tim2
  if (jeParan) await sledeciSlot.update({ tim1_id: pobjednikId });
  else await sledeciSlot.update({ tim2_id: pobjednikId });
  await eventualnoProguraiBye(sledeciSlot);
}

// Unosi rezultat meča u bracketu i automatski gura pobjednika dalje
exports.unesiRezultatBracketa = async (req, res) => {
  const { pobjednik_tim_id, rezultat } = req.body;
  const slot = await RasporedTurnira.findByPk(req.params.slotId, { include: [{ model: Tim, as: 'tim1' }, { model: Tim, as: 'tim2' }, { model: Turnir }] });
  if (!slot) return res.status(404).json({ poruka: 'Meč u bracketu nije pronađen.' });
  if (!slot.tim1_id || !slot.tim2_id) return res.status(400).json({ poruka: 'Oba tima moraju biti poznata prije unosa rezultata.' });

  const mec = await ScrimMec.create({
    tim1_id: slot.tim1_id, tim2_id: slot.tim2_id, turnir_id: slot.turnir_id,
    runda_broj: slot.runda_broj, zakazano_za: new Date(), pobjednik_tim_id, rezultat, status: 'odigran',
  });
  await slot.update({ mec_id: mec.id });

  if (slot.sledeci_slot_id) {
    const sledeciSlot = await RasporedTurnira.findByPk(slot.sledeci_slot_id);
    const jeParan = slot.pozicija_u_rundi % 2 === 1;
    if (jeParan) await sledeciSlot.update({ tim1_id: pobjednik_tim_id });
    else await sledeciSlot.update({ tim2_id: pobjednik_tim_id });
  } else {
    // finale odigrano -> turnir zavrsen, dostignuce pobjednicima
    const turnir = await Turnir.findByPk(slot.turnir_id);
    await turnir.update({ status: 'zavrsen' });
    const pobjednickiClanovi = await ClanTima.findAll({ where: { tim_id: pobjednik_tim_id } });
    const dostignuce = await Dostignuce.findOne({ where: { uslov_tip: 'osvojen_turnir' } });
    if (dostignuce) {
      for (const clan of pobjednickiClanovi) {
        const [, kreirano] = await KorisnikDostignuce.findOrCreate({ where: { korisnik_id: clan.korisnik_id, dostignuce_id: dostignuce.id } });
        if (kreirano) await posaljiNotifikaciju(clan.korisnik_id, 'novo_dostignuce', `Osvojili ste dostignuće: ${dostignuce.naziv}`);
      }
    }
  }

  res.json({ poruka: 'Rezultat je unesen.', slot });
};
