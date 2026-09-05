const { Konverzacija, ClanKonverzacije } = require('../models');

// Osigurava da tim ima svoju grupnu konverzaciju (pravi je ako ne postoji).
async function osigurajTimKonverzaciju(tim_id) {
  const [konverzacija] = await Konverzacija.findOrCreate({
    where: { tim_id, tip: 'tim' },
    defaults: { tim_id, tip: 'tim' },
  });
  return konverzacija;
}

// Dodaje korisnika u timski chat (koristi se kad se pridruži timu preko pozivnice/aplikacije/kreiranja).
async function dodajUTimskiChat(tim_id, korisnik_id) {
  const konverzacija = await osigurajTimKonverzaciju(tim_id);
  await ClanKonverzacije.findOrCreate({
    where: { konverzacija_id: konverzacija.id, korisnik_id },
    defaults: { konverzacija_id: konverzacija.id, korisnik_id, status: 'prihvacena' },
  });
  return konverzacija;
}

// Uklanja korisnika iz timskog chata (koristi se kad kapiten ukloni člana iz tima).
async function ukloniIzTimskogChata(tim_id, korisnik_id) {
  const konverzacija = await Konverzacija.findOne({ where: { tim_id, tip: 'tim' } });
  if (!konverzacija) return;
  await ClanKonverzacije.destroy({ where: { konverzacija_id: konverzacija.id, korisnik_id } });
}

module.exports = { osigurajTimKonverzaciju, dodajUTimskiChat, ukloniIzTimskogChata };
