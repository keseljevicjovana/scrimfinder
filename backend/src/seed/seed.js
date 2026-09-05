require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const {
  Korisnik, Igra, Pozicija, ProfilIgraca, Dostupnost, Tim, ClanTima,
  ScrimZahtjev, ScrimMec, PrisustvoMeca, Komentar, KomentarLajk,
  Dostignuce, KorisnikDostignuce, Notifikacija, Turnir, TurnirPrijava,
  Konverzacija, ClanKonverzacije, Poruka,
} = require('../models');
const { generisiNasumicniAvatar } = require('../utils/avatarOptions');
const { dodajUTimskiChat } = require('../utils/chat');

function danaUnazad(dani, sat = 19) {
  const d = new Date(Date.now() - dani * 24 * 3600 * 1000);
  d.setHours(sat, 0, 0, 0);
  return d;
}

// Nasumičan status prisustva, sa realističnom raspodjelom: većina potvrdi da može,
// pokoji ne može, a nekoliko nikad i ne odgovori (na_cekanju) — baš kao u stvarnom životu.
function nasumicnoPrisustvo() {
  const r = Math.random();
  if (r < 0.72) return 'moze';
  if (r < 0.90) return 'ne_moze';
  return 'na_cekanju';
}

// Pravi "odigran" scrim meč — kapiteni su već glasali (ishod je odmah poznat),
// i prisustvo-zapisima za sve pozvane članove oba tima, sa realistično MIJEŠANIM statusima
// (kapiteni koji glasaju uvijek su "moze", jer su očigledno prisustvovali da bi mogli glasati).
async function napraviOdigranMec(timA, timB, dani, ishod, clanoviA, clanoviB) {
  const zahtjev = await ScrimZahtjev.create({
    tim_posiljalac_id: timA.id, tim_primalac_id: timB.id,
    predlozeni_termin: danaUnazad(dani), broj_mapa: Math.random() > 0.5 ? 3 : 1, pravila: 'Standardna pravila.', status: 'prihvacen',
  });
  const glasA = ishod === 'tim1' ? 'pobjeda' : ishod === 'tim2' ? 'poraz' : 'nerijeseno';
  const glasB = ishod === 'tim2' ? 'pobjeda' : ishod === 'tim1' ? 'poraz' : 'nerijeseno';
  const mec = await ScrimMec.create({
    zahtjev_id: zahtjev.id, tim1_id: timA.id, tim2_id: timB.id,
    zakazano_za: danaUnazad(dani), status: 'odigran', ishod,
    glas_tim1: glasA, glas_tim2: glasB,
    pobjednik_tim_id: ishod === 'tim1' ? timA.id : ishod === 'tim2' ? timB.id : null,
    rezultat: ishod === 'nerijeseno' ? null : (Math.random() > 0.5 ? '2-1' : '2-0'),
  });
  for (const korisnik of clanoviA) {
    const status = korisnik.id === timA.kapiten_id ? 'moze' : nasumicnoPrisustvo();
    await PrisustvoMeca.create({ mec_id: mec.id, korisnik_id: korisnik.id, tim_id: timA.id, status });
  }
  for (const korisnik of clanoviB) {
    const status = korisnik.id === timB.kapiten_id ? 'moze' : nasumicnoPrisustvo();
    await PrisustvoMeca.create({ mec_id: mec.id, korisnik_id: korisnik.id, tim_id: timB.id, status });
  }
  return mec;
}

// Pravi CIJELU SERIJU mečeva između dva tima, ravnomjerno raspoređenu kroz vrijeme
// (od "dana_najstariji" do "dana_najnoviji" dana unazad) — koristi se da istorija svakog
// tima bude velika i realistična, sa unaprijed osmišljenim ishodima (ne čistim slučajem),
// baš da bismo bili sigurni da NIKO ne završi sa 100% (ili 0%) uspješnosti.
async function napraviSeriju(timA, timB, ishodi, dana_najstariji, dana_najnoviji, clanoviA, clanoviB) {
  const rezultati = [];
  const n = ishodi.length;
  for (let i = 0; i < n; i++) {
    const dani = Math.round(dana_najstariji - (i / (n - 1)) * (dana_najstariji - dana_najnoviji));
    const mec = await napraviOdigranMec(timA, timB, dani, ishodi[i], clanoviA, clanoviB);
    rezultati.push(mec);
  }
  return rezultati;
}

async function seed() {
  await sequelize.sync({ force: true });
  console.log('Baza je resetovana. Ubacujem test podatke...');

  const lozinkaHash = await bcrypt.hash('lozinka123', 10);

  // ---------- IGRE I POZICIJE ----------
  const lol = await Igra.create({ naziv: 'League of Legends', ima_pozicije: true });
  const cs2 = await Igra.create({ naziv: 'Counter-Strike 2', ima_pozicije: false });
  const valorant = await Igra.create({ naziv: 'Valorant', ima_pozicije: true });

  const pozLol = {};
  for (const naziv of ['Top', 'Jungle', 'Mid', 'Bot', 'Support']) {
    pozLol[naziv] = await Pozicija.create({ igra_id: lol.id, naziv });
  }
  const pozVal = {};
  for (const naziv of ['Duelist', 'Controller', 'Sentinel', 'Initiator']) {
    pozVal[naziv] = await Pozicija.create({ igra_id: valorant.id, naziv });
  }

  // ---------- KORISNICI ----------
  const admin = await Korisnik.create({
    ime: 'Marko Jovanović', email: 'admin@scrimfinder.rs', lozinka_hash: lozinkaHash, uloga: 'admin',
    pol: 'muski', avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false,
  });

  // Indeksi 0–15, korišćeni dalje u timovima (komentar uz svako ime govori u kom timu/timovima je).
  // "igre" je NIZ (jedan igrač može igrati više igara) — svaki unos ima svoju igru i (opciono) poziciju.
  const podaciIgraca = [
    { ime: 'Nikola Petrović', email: 'nikola@scrimfinder.rs', pol: 'muski', igre: [{ igra: lol, pozicija: pozLol['Mid'] }] },       // 0 - kapiten Crveni Zmajevi (LoL)
    { ime: 'Stefan Ilić', email: 'stefan@scrimfinder.rs', pol: 'muski', igre: [{ igra: lol, pozicija: pozLol['Jungle'] }, { igra: cs2, pozicija: null }] }, // 1 - Crveni Zmajevi (LoL) + Zetska Falanga (CS2) — igra obje
    { ime: 'Miloš Stojanović', email: 'milos@scrimfinder.rs', pol: 'muski', igre: [{ igra: lol, pozicija: pozLol['Top'] }, { igra: valorant, pozicija: pozVal['Sentinel'] }] }, // 2 - Crveni Zmajevi (LoL) + Južna Vatra (Valorant)
    { ime: 'Aleksandar Đorđević', email: 'aleksandar@scrimfinder.rs', pol: 'muski', igre: [{ igra: lol, pozicija: pozLol['Bot'] }] }, // 3 - kapiten Beogradski Vukovi (LoL)
    { ime: 'Jovana Filipović', email: 'jovana@scrimfinder.rs', pol: 'zenski', igre: [{ igra: lol, pozicija: pozLol['Support'] }] }, // 4 - Beogradski Vukovi (LoL)
    { ime: 'Luka Marković', email: 'luka@scrimfinder.rs', pol: 'muski', igre: [{ igra: cs2, pozicija: null }] },                    // 5 - kapiten Balkan Legion (CS2)
    { ime: 'Vuk Pavlović', email: 'vuk@scrimfinder.rs', pol: 'muski', igre: [{ igra: cs2, pozicija: null }, { igra: valorant, pozicija: pozVal['Duelist'] }] }, // 6 - Balkan Legion (CS2) + Južna Vatra (Valorant)
    { ime: 'Milica Simić', email: 'milica@scrimfinder.rs', pol: 'zenski', igre: [{ igra: cs2, pozicija: null }] },                  // 7 - Balkan Legion (CS2)
    { ime: 'Uroš Radovanović', email: 'uros@scrimfinder.rs', pol: 'muski', igre: [{ igra: cs2, pozicija: null }] },                 // 8 - kapiten Novosadski Sokolovi (CS2)
    { ime: 'Bogdan Kovačević', email: 'bogdan@scrimfinder.rs', pol: 'muski', igre: [{ igra: cs2, pozicija: null }, { igra: lol, pozicija: pozLol['Support'] }] }, // 9 - kapiten Zetska Falanga (CS2) + Zmajevi Jug (LoL)
    { ime: 'Petar Vasić', email: 'petar@scrimfinder.rs', pol: 'muski', igre: [{ igra: valorant, pozicija: pozVal['Duelist'] }] },   // 10 - kapiten Nišvil Fantomi (Valorant)
    { ime: 'Ivana Milenković', email: 'ivana@scrimfinder.rs', pol: 'zenski', igre: [{ igra: valorant, pozicija: pozVal['Sentinel'] }] }, // 11 - Nišvil Fantomi (Valorant)
    { ime: 'Nemanja Todorović', email: 'nemanja@scrimfinder.rs', pol: 'muski', igre: [{ igra: valorant, pozicija: pozVal['Controller'] }] }, // 12 - Nišvil Fantomi (Valorant)
    { ime: 'Dušan Ristić', email: 'dusan@scrimfinder.rs', pol: 'muski', igre: [{ igra: valorant, pozicija: pozVal['Initiator'] }] }, // 13 - kapiten Južna Vatra (Valorant)
    { ime: 'Tijana Popović', email: 'tijana@scrimfinder.rs', pol: 'zenski', igre: [{ igra: lol, pozicija: pozLol['Mid'] }] },       // 14 - kapiten Zmajevi Jug (LoL)
    { ime: 'Vladimir Antić', email: 'vladimir@scrimfinder.rs', pol: 'muski', igre: [{ igra: cs2, pozicija: null }] },               // 15 - Novosadski Sokolovi (CS2)
  ];

  const igraci = [];
  for (const p of podaciIgraca) {
    const nazivIgara = p.igre.map((i) => i.igra.naziv).join(' i ');
    const korisnik = await Korisnik.create({
      ime: p.ime, email: p.email, lozinka_hash: lozinkaHash, pol: p.pol,
      avatar: generisiNasumicniAvatar(p.pol), mora_promijeniti_lozinku: false,
      bio: `Igram ${nazivIgara} već nekoliko godina, tražim ozbiljan tim za redovne skrimove.`,
    });
    for (const i of p.igre) {
      await ProfilIgraca.create({
        korisnik_id: korisnik.id, igra_id: i.igra.id,
        pozicija_id: i.pozicija ? i.pozicija.id : null,
      });
    }
    // dostupnost: variramo malo po igraču da pretraga po danu/vremenu ima smisla
    const dani = [1, 3, 6];
    await Dostupnost.bulkCreate(dani.map((dan) => ({
      korisnik_id: korisnik.id, dan_u_sedmici: dan,
      vrijeme_od: dan === 6 ? '14:00:00' : '19:00:00',
      vrijeme_do: dan === 6 ? '22:00:00' : '23:00:00',
    })));
    igraci.push(korisnik);
  }

  // ---------- TIMOVI (sa primjerom generisanog grba za tri od njih) ----------
  const timLol1 = await Tim.create({
    naziv: 'Crveni Zmajevi', igra_id: lol.id, opis: 'Ambiciozan LoL tim, tražimo ozbiljne skrimove.', kapiten_id: igraci[0].id,
    grb: { oblik: 'stit', pozadina: '#1a1330', simbol: 'zmaj', simbolBoja: '#ff2ec4' },
  });
  const timLol2 = await Tim.create({ naziv: 'Beogradski Vukovi', igra_id: lol.id, opis: 'Igramo za zabavu, ali ozbiljno treniramo.', kapiten_id: igraci[3].id });
  const timCs1 = await Tim.create({
    naziv: 'Balkan Legion', igra_id: cs2.id, opis: 'Bivši ESEA igrači, tražimo protivnike svog ranga.', kapiten_id: igraci[5].id,
    grb: { oblik: 'heksagon', pozadina: '#0d0f18', simbol: 'lobanja', simbolBoja: '#00f0ff' },
  });
  const timCs2 = await Tim.create({ naziv: 'Novosadski Sokolovi', igra_id: cs2.id, opis: 'Mladi tim u usponu.', kapiten_id: igraci[8].id });
  const timVal1 = await Tim.create({
    naziv: 'Nišvil Fantomi', igra_id: valorant.id, opis: 'Takmičarski Valorant tim iz Niša.', kapiten_id: igraci[10].id,
    grb: { oblik: 'dijamant', pozadina: '#1a1330', simbol: 'plamen', simbolBoja: '#ffe14d' },
  });
  const timLol3 = await Tim.create({ naziv: 'Zmajevi Jug', igra_id: lol.id, opis: 'Regionalni LoL tim iz Niša.', kapiten_id: igraci[14].id });
  const timCs3 = await Tim.create({ naziv: 'Zetska Falanga', igra_id: cs2.id, opis: 'CS2 tim iz Podgorice.', kapiten_id: igraci[9].id });
  const timVal2 = await Tim.create({ naziv: 'Južna Vatra', igra_id: valorant.id, opis: 'Agresivan Valorant sastav.', kapiten_id: igraci[13].id });

  // VAŽNO: rosteri su namjerno tako podešeni da NIJEDAN igrač nije član DVA tima koja igraju
  // jedna protiv drugog (isti igrač SMIJE biti u dva tima različitih igara — to se nikad ne sudara).
  const clanstva = [
    [timLol1, [0, 1, 2]],
    [timLol2, [3, 4]],
    [timLol3, [14, 9]],       // 9 (Bogdan) je inače kapiten Zetska Falanga (CS2) — bezbjedno, različita igra
    [timCs1, [5, 6, 7]],
    [timCs2, [8, 15]],
    [timCs3, [9, 1]],          // 1 (Stefan) je inače Crveni Zmajevi (LoL) — bezbjedno, različita igra
    [timVal1, [10, 11, 12]],
    [timVal2, [13, 2, 6]],     // 2 (Miloš, LoL) i 6 (Vuk, CS2) — bezbjedno, različite igre
  ];
  for (const [tim, indeksi] of clanstva) {
    for (const i of indeksi) {
      await ClanTima.findOrCreate({ where: { tim_id: tim.id, korisnik_id: igraci[i].id } });
      await dodajUTimskiChat(tim.id, igraci[i].id); // svaki clan automatski ulazi u timski chat
    }
  }
  const clanoviMap = new Map();
  for (const [tim, indeksi] of clanstva) clanoviMap.set(tim, indeksi.map((i) => igraci[i]));

  // ---------- SCRIM MEČEVI — velika, realistična istorija razmazana kroz ~5 mjeseci ----------
  // Ishodi su namjerno unaprijed osmišljeni (ne čist slučaj) da bismo garantovali raznolikost
  // rangova (nema svih Bronze) i da NIKO ne završi sa 100% ili 0% uspješnosti.
  const serLol12 = await napraviSeriju(
    timLol1, timLol2,
    ['tim1', 'tim1', 'tim2', 'tim1', 'nerijeseno', 'tim1', 'tim2', 'tim1'],
    150, 20, clanoviMap.get(timLol1), clanoviMap.get(timLol2),
  );
  await napraviSeriju(
    timLol1, timLol3,
    ['tim1', 'tim2', 'tim1', 'tim1', 'tim2', 'tim1', 'tim1', 'tim2'],
    140, 15, clanoviMap.get(timLol1), clanoviMap.get(timLol3),
  );
  await napraviSeriju(
    timLol2, timLol3,
    ['tim2', 'tim1', 'tim1', 'nerijeseno', 'tim2', 'tim1', 'tim2', 'tim1'],
    130, 10, clanoviMap.get(timLol2), clanoviMap.get(timLol3),
  );

  await napraviSeriju(
    timCs1, timCs2,
    ['tim1', 'tim1', 'tim1', 'tim2', 'tim1', 'tim1', 'nerijeseno', 'tim1'],
    150, 18, clanoviMap.get(timCs1), clanoviMap.get(timCs2),
  );
  await napraviSeriju(
    timCs1, timCs3,
    ['tim1', 'tim1', 'tim2', 'tim1', 'tim1', 'tim2', 'tim1', 'tim1'],
    140, 12, clanoviMap.get(timCs1), clanoviMap.get(timCs3),
  );
  await napraviSeriju(
    timCs2, timCs3,
    ['tim1', 'tim2', 'tim2', 'tim1', 'nerijeseno', 'tim2', 'tim1', 'tim2'],
    130, 8, clanoviMap.get(timCs2), clanoviMap.get(timCs3),
  );

  await napraviSeriju(
    timVal1, timVal2,
    ['tim1', 'tim1', 'tim2', 'tim1', 'tim1', 'nerijeseno', 'tim2', 'tim1', 'tim1', 'tim2', 'tim1', 'tim1'],
    145, 4, clanoviMap.get(timVal1), clanoviMap.get(timVal2),
  );

  const mec1 = serLol12[0];

  // Primjer SPORNOG meča — oba kapitena su glasala "pobjeda" za svoj tim, čeka admina.
  const zahtjevSporni = await ScrimZahtjev.create({
    tim_posiljalac_id: timCs1.id, tim_primalac_id: timCs3.id,
    predlozeni_termin: danaUnazad(1), broj_mapa: 3, pravila: 'Best of 3, MR12.', status: 'prihvacen',
  });
  const mecSporni = await ScrimMec.create({
    zahtjev_id: zahtjevSporni.id, tim1_id: timCs1.id, tim2_id: timCs3.id,
    zakazano_za: danaUnazad(1), status: 'sporno', glas_tim1: 'pobjeda', glas_tim2: 'pobjeda',
  });
  for (const k of clanoviMap.get(timCs1)) await PrisustvoMeca.create({ mec_id: mecSporni.id, korisnik_id: k.id, tim_id: timCs1.id, status: 'moze' });
  for (const k of clanoviMap.get(timCs3)) await PrisustvoMeca.create({ mec_id: mecSporni.id, korisnik_id: k.id, tim_id: timCs3.id, status: 'moze' });

  // Budući, zakazani mečevi (još neodigrani) — demonstriraju kalendar i "da li možeš prisustvovati" glasanje.
  async function napraviBuduciMec(timA, timB, dana, sat) {
    const zahtjev = await ScrimZahtjev.create({
      tim_posiljalac_id: timA.id, tim_primalac_id: timB.id,
      predlozeni_termin: danaUnazad(-dana, sat), broj_mapa: 1, pravila: 'Best of 1.', status: 'prihvacen',
    });
    const mec = await ScrimMec.create({
      zahtjev_id: zahtjev.id, tim1_id: timA.id, tim2_id: timB.id,
      zakazano_za: zahtjev.predlozeni_termin, status: 'zakazan',
    });
    for (const k of clanoviMap.get(timA)) {
      await PrisustvoMeca.create({ mec_id: mec.id, korisnik_id: k.id, tim_id: timA.id, status: k.id === timA.kapiten_id ? 'moze' : (Math.random() > 0.4 ? 'moze' : 'na_cekanju') });
    }
    for (const k of clanoviMap.get(timB)) {
      await PrisustvoMeca.create({ mec_id: mec.id, korisnik_id: k.id, tim_id: timB.id, status: k.id === timB.kapiten_id ? 'moze' : 'na_cekanju' });
    }
    return mec;
  }
  await napraviBuduciMec(timVal1, timVal2, 2, 20);
  await napraviBuduciMec(timLol1, timLol3, 4, 19);
  await napraviBuduciMec(timCs2, timCs1, 6, 21);

  // Zahtjevi koji još čekaju odgovor kapitena primaoca (demonstriraju ScrimRequests stranicu).
  await ScrimZahtjev.create({
    tim_posiljalac_id: timCs2.id, tim_primalac_id: timCs3.id,
    predlozeni_termin: new Date(Date.now() + 5 * 24 * 3600 * 1000), broj_mapa: 3,
    pravila: 'Best of 3, MR12.', status: 'na_cekanju',
  });
  await ScrimZahtjev.create({
    tim_posiljalac_id: timLol2.id, tim_primalac_id: timLol1.id,
    predlozeni_termin: new Date(Date.now() + 8 * 24 * 3600 * 1000), broj_mapa: 1,
    pravila: 'Revanš, isti sastav.', status: 'na_cekanju',
  });
  await ScrimZahtjev.create({
    tim_posiljalac_id: timVal2.id, tim_primalac_id: timVal1.id,
    predlozeni_termin: new Date(Date.now() + 3 * 24 * 3600 * 1000), broj_mapa: 1,
    pravila: 'Best of 1, casual.', status: 'odbijen',
  });

  // ---------- CHAT — bogatiji set poruka, konverzacija i zahtjeva ----------
  async function poruke(tim, redovi) {
    const konv = await Konverzacija.findOne({ where: { tim_id: tim.id, tip: 'tim' } });
    if (!konv) return;
    let t = danaUnazad(3, 18);
    const zapisi = redovi.map((r, idx) => ({
      konverzacija_id: konv.id, posiljalac_id: r[0].id, tekst: r[1],
      created_at: new Date(t.getTime() + idx * 6 * 60 * 1000),
    }));
    await Poruka.bulkCreate(zapisi);
  }
  await poruke(timLol1, [
    [igraci[0], 'Ekipo, trening večeras u 19h kao i obično?'],
    [igraci[1], 'Može, stižem.'],
    [igraci[2], 'Ja kasnim 10-ak minuta, krećem sa posla.'],
    [igraci[0], 'Ok, čekamo te. Fokus na draft danas.'],
    [igraci[2], 'Skinuo sam replay od poslednjeg meča, pogledajte prije treninga.'],
  ]);
  await poruke(timCs1, [
    [igraci[5], 'Sredio sam termin za sledeći skrim, u kalendaru je.'],
    [igraci[6], 'Vidim, super. Idemo ranije da zagrijemo aim.'],
    [igraci[7], 'Ja mogu od 18:30.'],
    [igraci[5], 'Važi, vidimo se onda tada.'],
  ]);
  await poruke(timVal1, [
    [igraci[10], 'Moramo da popravimo defaultove na B strani.'],
    [igraci[11], 'Slažem se, previše smo predvidivi.'],
    [igraci[12], 'Snimiću par demo rundi, pa pošaljem klipove ovdje.'],
  ]);

  // Direktne poruke — nekoliko prihvaćenih razgovora sa istorijom
  async function dm(a, b, poruke, aProcitano = true, bProcitano = true) {
    const konv = await Konverzacija.create({ tip: 'direktna' });
    await ClanKonverzacije.create({ konverzacija_id: konv.id, korisnik_id: a.id, status: 'prihvacena', poslednje_procitano_at: aProcitano ? new Date() : null });
    await ClanKonverzacije.create({ konverzacija_id: konv.id, korisnik_id: b.id, status: 'prihvacena', poslednje_procitano_at: bProcitano ? new Date() : danaUnazad(2) });
    let t = danaUnazad(2, 12);
    const zapisi = poruke.map(([posiljalac, tekst], idx) => ({
      konverzacija_id: konv.id, posiljalac_id: posiljalac.id, tekst,
      created_at: new Date(t.getTime() + idx * 4 * 60 * 1000),
    }));
    await Poruka.bulkCreate(zapisi);
    return konv;
  }
  await dm(igraci[0], igraci[5], [
    [igraci[0], 'Ćao, jeste za scrim ovog vikenda?'],
    [igraci[5], 'Jesmo, pošalji zahtjev pa dogovaramo detalje.'],
    [igraci[0], 'Poslao sam, pogledaj kad stigneš.'],
  ]);
  await dm(igraci[3], igraci[14], [
    [igraci[14], 'Vidjeli smo da tražite skrimove, igramo istu igru.'],
    [igraci[3], 'Super, javi se kad imaš slobodan termin.'],
  ], true, false);
  await dm(igraci[8], igraci[9], [
    [igraci[8], 'Dobra igra prošli put, GG.'],
    [igraci[9], 'GG, revanš kad hoćete.'],
  ]);

  // Direktne poruke na čekanju — demonstriraju tab "Zahtjevi"
  const dmZahtjev1 = await Konverzacija.create({ tip: 'direktna' });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev1.id, korisnik_id: igraci[10].id, status: 'prihvacena', poslednje_procitano_at: new Date() });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev1.id, korisnik_id: igraci[0].id, status: 'na_cekanju' });
  await Poruka.create({ konverzacija_id: dmZahtjev1.id, posiljalac_id: igraci[10].id, tekst: 'Ćao Nikola, vidjeli smo vaš tim na turniru — igrate li i Valorant?' });
  await Notifikacija.create({ korisnik_id: igraci[0].id, tip: 'poruka_zahtjev', poruka: 'Petar Vasić vam je poslao/la zahtjev za poruku.', procitano: false });

  const dmZahtjev2 = await Konverzacija.create({ tip: 'direktna' });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev2.id, korisnik_id: igraci[7].id, status: 'prihvacena', poslednje_procitano_at: new Date() });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev2.id, korisnik_id: igraci[11].id, status: 'na_cekanju' });
  await Poruka.create({ konverzacija_id: dmZahtjev2.id, posiljalac_id: igraci[7].id, tekst: 'Hej, tražimo petog za mixed turnir, da li si zainteresovana?' });
  await Notifikacija.create({ korisnik_id: igraci[11].id, tip: 'poruka_zahtjev', poruka: 'Milica Simić vam je poslao/la zahtjev za poruku.', procitano: false });

  // ---------- KOMENTARI I LAJKOVI ----------
  const komentar1 = await Komentar.create({ autor_id: igraci[5].id, entitet_tip: 'tim', entitet_id: timLol1.id, tekst: 'Odigrali smo protiv njih, veoma organizovan tim, preporučujem za skrimove!' });
  await KomentarLajk.create({ komentar_id: komentar1.id, korisnik_id: igraci[1].id });
  await KomentarLajk.create({ komentar_id: komentar1.id, korisnik_id: igraci[2].id });
  await KomentarLajk.create({ komentar_id: komentar1.id, korisnik_id: igraci[4].id });
  const komentar2 = await Komentar.create({ autor_id: igraci[3].id, entitet_tip: 'mec', entitet_id: mec1.id, tekst: 'Dobra igra od obje strane, revanš uskoro!' });
  await KomentarLajk.create({ komentar_id: komentar2.id, korisnik_id: igraci[0].id });
  await Komentar.create({ autor_id: igraci[8].id, entitet_tip: 'tim', entitet_id: timCs1.id, tekst: 'Traže li ovi jos skrimove ovog mjeseca?' });

  // ---------- DOSTIGNUĆA ----------
  const d1 = await Dostignuce.create({ naziv: 'Prvih 10 mečeva', opis: 'Prisustvujte na 10 skrim mečeva.', uslov_tip: 'odigranih_meceva', uslov_vrijednost: 10 });
  const d2 = await Dostignuce.create({ naziv: 'Prva pobjeda', opis: 'Prisustvujte meču koji vaš tim pobijedi.', uslov_tip: 'pobjeda', uslov_vrijednost: 1 });
  const d3 = await Dostignuce.create({ naziv: 'Dominacija', opis: 'Win rate tima od 70% u mečevima kojima ste prisustvovali (min. 5).', uslov_tip: 'win_rate', uslov_vrijednost: 70 });
  const d4 = await Dostignuce.create({ naziv: 'Šampion turnira', opis: 'Osvojite turnir na platformi.', uslov_tip: 'osvojen_turnir', uslov_vrijednost: 1 });
  await KorisnikDostignuce.create({ korisnik_id: igraci[0].id, dostignuce_id: d2.id });

  // ---------- NOTIFIKACIJE ----------
  await Notifikacija.create({ korisnik_id: igraci[3].id, tip: 'scrim_zahtjev_prihvacen', poruka: 'Tim "Crveni Zmajevi" je prihvatio vaš scrim zahtjev.', link_entitet_tip: 'mec', link_entitet_id: mec1.id, procitano: false });
  await Notifikacija.create({ korisnik_id: igraci[0].id, tip: 'novo_dostignuce', poruka: 'Osvojili ste dostignuće: Prva pobjeda', link_entitet_tip: 'igrac', link_entitet_id: igraci[0].id, procitano: true });
  await Notifikacija.create({ korisnik_id: igraci[8].id, tip: 'scrim_zahtjev_primljen', poruka: 'Tim "Balkan Legion" vam je poslao scrim zahtjev.', link_entitet_tip: 'scrim_zahtjev', link_entitet_id: 1, procitano: false });

  // ---------- TURNIR ----------
  const turnir1 = await Turnir.create({
    naziv: 'ScrimFinder Kup — Jesen 2026', igra_id: lol.id,
    datum: new Date(Date.now() + 14 * 24 * 3600 * 1000), max_timova: 4, format: 'single_elimination',
  });
  await TurnirPrijava.create({ turnir_id: turnir1.id, tim_id: timLol1.id });
  await TurnirPrijava.create({ turnir_id: turnir1.id, tim_id: timLol2.id });

  const timNaziviPoIgracu = {};
  for (const [tim, indeksi] of clanstva) {
    for (const i of indeksi) {
      timNaziviPoIgracu[i] = timNaziviPoIgracu[i] ? `${timNaziviPoIgracu[i]}, ${tim.naziv}` : tim.naziv;
    }
  }

  console.log('\nTest podaci su uspješno ubačeni.\n');
  console.log('======================================================================');
  console.log(' NALOZI ZA PRIJAVU — lozinka za SVE naloge: lozinka123');
  console.log(' (mora_promijeniti_lozinku = false, prijava je odmah moguća, bez OTP-a)');
  console.log('======================================================================');
  console.log(` ADMIN     ${admin.email.padEnd(30)} ${admin.ime}`);
  console.log('----------------------------------------------------------------------');
  podaciIgraca.forEach((p, i) => {
    const tim = timNaziviPoIgracu[i] || '(bez tima)';
    const kapiten = [timLol1, timLol2, timCs1, timCs2, timVal1, timLol3, timCs3, timVal2]
      .some((t) => t.kapiten_id === igraci[i].id) ? ' [KAPITEN]' : '';
    console.log(` Igrač ${String(i + 1).padStart(2, '0')}  ${p.email.padEnd(30)} ${p.ime.padEnd(24)} ${tim}${kapiten}`);
  });
  console.log('======================================================================');
  console.log(` Timovi u bazi: ${timLol1.naziv}, ${timLol2.naziv}, ${timLol3.naziv}, ${timCs1.naziv}, ${timCs2.naziv}, ${timCs3.naziv}, ${timVal1.naziv}, ${timVal2.naziv}`);
  console.log(' 16 odigranih mečeva + 1 sporan + 3 buduća zakazana, sa realistično miješanim prisustvom.');
  console.log(' Chat: svaki tim ima grupni chat sa porukama; nekoliko DM razgovora + 2 DM zahtjeva na čekanju.');
  console.log('======================================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Greška prilikom seed-ovanja:', err);
  process.exit(1);
});
