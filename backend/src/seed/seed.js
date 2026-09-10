require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const {
  Korisnik, Igra, Pozicija, ProfilIgraca, Dostupnost, Tim, ClanTima,
  ScrimZahtjev, ScrimMec, PrisustvoMeca, Komentar, KomentarLajk,
  Dostignuce, KorisnikDostignuce, Notifikacija, Turnir, TurnirPrijava, RasporedTurnira,
  Konverzacija, ClanKonverzacije, Poruka,
} = require('../models');
const { generisiNasumicniAvatar } = require('../utils/avatarOptions');
const { dodajUTimskiChat } = require('../utils/chat');

// ============================================================
// POMOĆNE FUNKCIJE
// ============================================================
function danaUnazad(dani, sat = 19) {
  const d = new Date(Date.now() - dani * 24 * 3600 * 1000);
  d.setHours(sat, 0, 0, 0);
  return d;
}
function nasumicno(niz) { return niz[Math.floor(Math.random() * niz.length)]; }
function nasumicniBroj(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function izmijesaj(niz) {
  const kopija = [...niz];
  for (let i = kopija.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopija[i], kopija[j]] = [kopija[j], kopija[i]];
  }
  return kopija;
}
function ocisti(tekst) {
  return tekst.toLowerCase().replace(/[čć]/g, 'c').replace(/ž/g, 'z').replace(/š/g, 's').replace(/đ/g, 'dj');
}
// Pravi jednostavnu SVG "sliku" (screenshot dokaz) kao base64 data-URL — ne treba nam
// pravi fajl/cloud storage, browser prikazuje SVG data-URL identično kao pravu sliku.
function napraviSlikuDokaza(naslov, linija1, linija2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240">
    <rect width="420" height="240" fill="#0d0a16"/>
    <rect x="8" y="8" width="404" height="224" fill="none" stroke="#00f0ff" stroke-width="2"/>
    <text x="30" y="50" fill="#ffe14d" font-family="monospace" font-size="18" font-weight="bold">${naslov}</text>
    <text x="30" y="100" fill="#f1eaff" font-family="monospace" font-size="14">${linija1}</text>
    <text x="30" y="130" fill="#f1eaff" font-family="monospace" font-size="14">${linija2}</text>
    <text x="30" y="200" fill="#9c8fc2" font-family="monospace" font-size="11">screenshot-dokaz.png (simulacija)</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function nasumicnoPrisustvo() {
  const r = Math.random();
  if (r < 0.72) return 'moze';
  if (r < 0.90) return 'ne_moze';
  return 'na_cekanju';
}

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
  const prisustvaZaUpis = [];
  for (const korisnik of clanoviA) {
    prisustvaZaUpis.push({ mec_id: mec.id, korisnik_id: korisnik.id, tim_id: timA.id, status: korisnik.id === timA.kapiten_id ? 'moze' : nasumicnoPrisustvo() });
  }
  for (const korisnik of clanoviB) {
    prisustvaZaUpis.push({ mec_id: mec.id, korisnik_id: korisnik.id, tim_id: timB.id, status: korisnik.id === timB.kapiten_id ? 'moze' : nasumicnoPrisustvo() });
  }
  await PrisustvoMeca.bulkCreate(prisustvaZaUpis);
  return mec;
}

async function napraviSeriju(timA, timB, ishodi, dana_najstariji, dana_najnoviji, clanoviA, clanoviB) {
  const rezultati = [];
  const n = ishodi.length;
  for (let i = 0; i < n; i++) {
    const dani = Math.round(dana_najstariji - (i / (n - 1)) * (dana_najstariji - dana_najnoviji));
    rezultati.push(await napraviOdigranMec(timA, timB, dani, ishodi[i], clanoviA, clanoviB));
  }
  return rezultati;
}

// Budući, još neodigran meč — status 'zakazan', puni kalendar i "možeš li prisustvovati" pitanja.
async function napraviBuduciMec(timA, timB, danaUnaprijed, clanoviA, clanoviB) {
  const termin = danaUnazad(-danaUnaprijed, nasumicno([18, 19, 20, 21]));
  const zahtjev = await ScrimZahtjev.create({
    tim_posiljalac_id: timA.id, tim_primalac_id: timB.id,
    predlozeni_termin: termin, broj_mapa: nasumicno([1, 1, 3]), pravila: 'Best of ' + nasumicno([1, 3]) + '.', status: 'prihvacen',
  });
  const mec = await ScrimMec.create({ zahtjev_id: zahtjev.id, tim1_id: timA.id, tim2_id: timB.id, zakazano_za: termin, status: 'zakazan' });
  const prisustvaZaUpis = [];
  for (const k of clanoviA) prisustvaZaUpis.push({ mec_id: mec.id, korisnik_id: k.id, tim_id: timA.id, status: k.id === timA.kapiten_id ? 'moze' : (Math.random() > 0.4 ? 'moze' : 'na_cekanju') });
  for (const k of clanoviB) prisustvaZaUpis.push({ mec_id: mec.id, korisnik_id: k.id, tim_id: timB.id, status: 'na_cekanju' });
  await PrisustvoMeca.bulkCreate(prisustvaZaUpis);
  return mec;
}

async function seed() {
  await sequelize.sync({ force: true });
  console.log('Baza je resetovana. Generišem veliki set test podataka (ovo može potrajati par minuta)...');

  const lozinkaHash = await bcrypt.hash('lozinka123', 10);

  // ============================================================
  // IGRE (10 ukupno — glavne tri + dodatnih sedam)
  // ============================================================
  const igreDef = [
    { naziv: 'League of Legends', pozicije: ['Top', 'Jungle', 'Mid', 'Bot', 'Support'] },
    { naziv: 'Counter-Strike 2', pozicije: null },
    { naziv: 'Valorant', pozicije: ['Duelist', 'Controller', 'Sentinel', 'Initiator'] },
    { naziv: 'Dota 2', pozicije: ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'] },
    { naziv: 'Rainbow Six Siege', pozicije: ['Entry', 'Support', 'Flex', 'Anchor'] },
    { naziv: 'Rocket League', pozicije: null },
    { naziv: 'EA Sports FC', pozicije: null },
    { naziv: 'Overwatch 2', pozicije: ['Tank', 'DPS', 'Support'] },
    { naziv: 'PUBG', pozicije: null },
    { naziv: 'Apex Legends', pozicije: ['Assault', 'Skirmisher', 'Recon'] },
  ];
  const igre = [];
  for (const def of igreDef) {
    const igra = await Igra.create({ naziv: def.naziv, ima_pozicije: !!def.pozicije });
    igra.pozicijeObj = {};
    if (def.pozicije) {
      for (const naziv of def.pozicije) igra.pozicijeObj[naziv] = await Pozicija.create({ igra_id: igra.id, naziv });
    }
    igre.push(igra);
  }
  const [lol, cs2, valorant, dota2, r6, rl, fifa, ow2, pubg, apex] = igre;

  // ============================================================
  // GENERISANJE 320 IGRAČA — pravoslavna srpska/crnogorska imena, @scrimfinder.me email
  // ============================================================
  const muskaImena = [
    'Nikola', 'Stefan', 'Miloš', 'Aleksandar', 'Luka', 'Vuk', 'Uroš', 'Bogdan', 'Petar', 'Nemanja',
    'Dušan', 'Vladimir', 'Marko', 'Đorđe', 'Filip', 'Aleksa', 'Ognjen', 'Lazar', 'Radovan', 'Vasilije',
    'Andrej', 'Jovan', 'Dejan', 'Igor', 'Boris', 'Vladan', 'Srđan', 'Goran', 'Milan', 'Nikša',
    'Rade', 'Slobodan', 'Zoran', 'Branislav', 'Dragan', 'Novak', 'Mihailo', 'Pavle', 'Savo', 'Vasilj',
  ];
  const zenskaImena = [
    'Jovana', 'Milica', 'Ivana', 'Tijana', 'Ana', 'Jelena', 'Marija', 'Teodora', 'Anđela', 'Sofija',
    'Katarina', 'Sara', 'Milena', 'Nina', 'Dragana', 'Bojana', 'Nataša', 'Dijana', 'Vesna', 'Snežana',
    'Ljiljana', 'Danijela', 'Aleksandra', 'Marina', 'Tamara',
  ];
  const prezimena = [
    'Petrović', 'Ilić', 'Stojanović', 'Đorđević', 'Filipović', 'Marković', 'Pavlović', 'Simić', 'Radovanović', 'Kovačević',
    'Vasić', 'Milenković', 'Todorović', 'Ristić', 'Popović', 'Antić', 'Nikolić', 'Jovanović', 'Đukanović', 'Vujović',
    'Radulović', 'Vukotić', 'Perović', 'Mijušković', 'Bulatović', 'Backović', 'Ivanović', 'Đukić', 'Knežević', 'Bošković',
    'Vukićević', 'Drašković', 'Vukmirović', 'Šćekić', 'Radonjić', 'Vujačić', 'Raičević', 'Mirković', 'Jokić', 'Lekić',
  ];

  const koriscenaMejlovi = new Set();
  function generisiIgraca() {
    const pol = Math.random() < 0.72 ? 'muski' : 'zenski';
    const ime = pol === 'muski' ? nasumicno(muskaImena) : nasumicno(zenskaImena);
    const prezime = nasumicno(prezimena);
    const emailBaza = `${ocisti(ime)}.${ocisti(prezime)}`;
    let email = `${emailBaza}@scrimfinder.me`;
    let brojac = 1;
    while (koriscenaMejlovi.has(email)) { brojac++; email = `${emailBaza}${brojac}@scrimfinder.me`; }
    koriscenaMejlovi.add(email);
    const brojIgaraZaOvog = Math.random() < 0.22 ? 2 : 1;
    const izabraneIgre = izmijesaj(igre).slice(0, brojIgaraZaOvog).map((igra) => ({
      igra, pozicija: igra.ima_pozicije ? nasumicno(Object.values(igra.pozicijeObj)) : null,
    }));
    return { ime: `${ime} ${prezime}`, email, pol, igre: izabraneIgre };
  }

  const admin = await Korisnik.create({
    ime: 'Marko Jovanović', email: 'admin@scrimfinder.me', lozinka_hash: lozinkaHash, uloga: 'admin',
    pol: 'muski', avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false,
  });

  // Tri "izlogačka" naloga — imaju NAJVIŠE timova, bogatu chat istoriju, jedan od njih razgovara sa adminom.
  const izlogNazivi = [
    { ime: 'Filip Vujović', email: 'filip.vujovic@scrimfinder.me', pol: 'muski' },
    { ime: 'Ana Radulović', email: 'ana.radulovic@scrimfinder.me', pol: 'zenski' },
    { ime: 'Marko Backović', email: 'marko.backovic@scrimfinder.me', pol: 'muski' },
  ];
  const izlogIgraci = [];
  for (const p of izlogNazivi) {
    koriscenaMejlovi.add(p.email);
    const korisnik = await Korisnik.create({
      ime: p.ime, email: p.email, lozinka_hash: lozinkaHash, pol: p.pol,
      avatar: generisiNasumicniAvatar(p.pol), mora_promijeniti_lozinku: false,
      bio: 'Aktivan/na na platformi, član više timova.',
    });
    // svaki od njih igra 3 različite igre, sa pozicijama gdje ih ima
    const izabraneIgre = izmijesaj(igre).slice(0, 3);
    for (const igra of izabraneIgre) {
      await ProfilIgraca.create({ korisnik_id: korisnik.id, igra_id: igra.id, pozicija_id: igra.ima_pozicije ? nasumicno(Object.values(igra.pozicijeObj)).id : null });
    }
    await Dostupnost.bulkCreate([
      { korisnik_id: korisnik.id, dan_u_sedmici: 1, vrijeme_od: '09:00:00', vrijeme_do: '11:00:00' },
      { korisnik_id: korisnik.id, dan_u_sedmici: 1, vrijeme_od: '19:00:00', vrijeme_do: '23:00:00' },
      { korisnik_id: korisnik.id, dan_u_sedmici: 3, vrijeme_od: '18:00:00', vrijeme_do: '22:00:00' },
      { korisnik_id: korisnik.id, dan_u_sedmici: 6, vrijeme_od: '12:00:00', vrijeme_do: '23:00:00' },
    ]);
    izlogIgraci.push(korisnik);
  }

  const brojIgraca = 320;
  // VAŽNO: izlog igrači NISU dio ove opšte liste — dodjeljuju im se POSEBNI, unaprijed
  // određeni timovi ispod (nema šanse da ih slučajni odabir gurne u isti tim kao neko drugo).
  const igraci = [];
  for (let i = 0; i < brojIgraca; i++) {
    const p = generisiIgraca();
    const korisnik = await Korisnik.create({
      ime: p.ime, email: p.email, lozinka_hash: lozinkaHash, pol: p.pol,
      avatar: generisiNasumicniAvatar(p.pol), mora_promijeniti_lozinku: false,
      bio: nasumicno(['Igram već nekoliko godina, tražim ozbiljan tim.', 'Rekreativno-takmičarski igrač, otvoren/a za nove timove.', 'Aktivan/na svaki dan, tražim ekipu za redovne skrimove.', '']),
    });
    if (p.igre.length > 0) {
      await ProfilIgraca.bulkCreate(p.igre.map((ig) => ({ korisnik_id: korisnik.id, igra_id: ig.igra.id, pozicija_id: ig.pozicija ? ig.pozicija.id : null })));
    }
    // dostupnost — nekim igračima VIŠE perioda istog dana (demonstrira funkciju)
    const brojDana = nasumicniBroj(1, 4);
    const dostupnostZaUpis = [];
    for (const dan of izmijesaj([0, 1, 2, 3, 4, 5, 6]).slice(0, brojDana)) {
      if (Math.random() < 0.3) {
        dostupnostZaUpis.push({ korisnik_id: korisnik.id, dan_u_sedmici: dan, vrijeme_od: '09:00:00', vrijeme_do: '11:30:00' });
        dostupnostZaUpis.push({ korisnik_id: korisnik.id, dan_u_sedmici: dan, vrijeme_od: '19:00:00', vrijeme_do: '23:00:00' });
      } else {
        dostupnostZaUpis.push({ korisnik_id: korisnik.id, dan_u_sedmici: dan, vrijeme_od: nasumicno(['18:00:00', '19:00:00', '20:00:00']), vrijeme_do: nasumicno(['22:00:00', '23:00:00']) });
      }
    }
    if (dostupnostZaUpis.length > 0) await Dostupnost.bulkCreate(dostupnostZaUpis);
    igraci.push(korisnik);
  }
  console.log(`Napravljeno ${igraci.length} igrača (+ admin).`);

  // ============================================================
  // GENERISANJE 100 TIMOVA — crnogorska imena gradova (uglavnom) + srpska (manjina)
  // ============================================================
  const crnogorskiGradovi = [
    'Podgorička', 'Nikšićki', 'Cetinjski', 'Budvanski', 'Barski', 'Bokeljski', 'Kotorski', 'Bjelopoljski',
    'Pljevaljski', 'Beranski', 'Tivatski', 'Ulcinjski', 'Rožajski', 'Danilovgradski', 'Herceg-novski',
    'Žabljački', 'Mojkovački', 'Plavski', 'Kolašinski', 'Šavnički',
  ];
  const srpskiGradovi = ['Beogradski', 'Novosadski', 'Niški', 'Kragujevački', 'Kraljevački'];
  const simboliTima = [
    'Vukovi', 'Sokolovi', 'Orlovi', 'Lavovi', 'Zmajevi', 'Tigrovi', 'Risovi', 'Medvjedi', 'Vitezovi', 'Gusari',
    'Munje', 'Titani', 'Furije', 'Legende', 'Ratnici', 'Kobre', 'Panteri', 'Jastrebovi', 'Šampioni', 'Đavoli',
    'Fantomi', 'Duhovi', 'Kraljevi', 'Berzerkeri', 'Nindže',
  ];
  const koriscenaImenaTimova = new Set();
  function generisiNazivTima() {
    const grad = Math.random() < 0.8 ? nasumicno(crnogorskiGradovi) : nasumicno(srpskiGradovi);
    let naziv = `${grad} ${nasumicno(simboliTima)}`;
    let brojac = 1;
    while (koriscenaImenaTimova.has(naziv)) { brojac++; naziv = `${grad} ${nasumicno(simboliTima)} ${brojac}`; }
    koriscenaImenaTimova.add(naziv);
    return naziv;
  }

  const grbOblici = ['stit', 'heksagon', 'dijamant', 'krug'];
  const grbSimboli = ['zmaj', 'lobanja', 'plamen', 'zvijezda', 'grom', 'macka', 'kandza'];
  const grbPozadine = ['#1a1330', '#0d0f18', '#241a3d', '#122018', '#2a1418', '#14202a'];
  const grbBoje = ['#00f0ff', '#ff2ec4', '#b23bff', '#ffe14d', '#39ff9e', '#ff8a3d'];
  function nasumicniGrb() {
    return Math.random() < 0.6 ? { oblik: nasumicno(grbOblici), pozadina: nasumicno(grbPozadine), simbol: nasumicno(grbSimboli), simbolBoja: nasumicno(grbBoje) } : null;
  }

  // Raspodjela 100 timova po igrama — glavne tri igre dobijaju više timova.
  const rasporedTimovaPoIgri = [
    [lol, 14], [cs2, 14], [valorant, 14],
    [dota2, 9], [r6, 9], [rl, 9], [fifa, 9], [ow2, 9], [pubg, 8], [apex, 8],
  ];

  const timoviPoIgri = new Map(); // igra.id -> [Tim, ...]
  const iskorisceniIgraciPoIgri = new Map(); // igra.id -> Set(korisnik.id) — sprečava sudar (isti igrač u dva tima ISTE igre)
  for (const igra of igre) { timoviPoIgri.set(igra.id, []); iskorisceniIgraciPoIgri.set(igra.id, new Set()); }

  const glavniOpisi = [
    'Ambiciozan tim, tražimo redovne skrimove.', 'Igramo za zabavu, ali ozbiljno treniramo.',
    'Bivši ligaški igrači, tražimo protivnike svog ranga.', 'Mladi tim u usponu.', 'Rekreativno-takmičarska ekipa.',
    'Tražimo stabilan sastav za sezonu.', 'Fokus na komunikaciju i timski rad.', '',
  ];

  const svaTimovi = [];
  const clanoviMap = new Map(); // Tim -> [Korisnik, ...]
  for (const [igra, brojTimova] of rasporedTimovaPoIgri) {
    for (let i = 0; i < brojTimova; i++) {
      const brojClanova = nasumicniBroj(3, 6);
      const dostupniIgraci = izmijesaj(igraci).filter((k) => !iskorisceniIgraciPoIgri.get(igra.id).has(k.id));
      if (dostupniIgraci.length < brojClanova) continue; // (ne bi trebalo da se desi sa 320 igrača, sigurnosna provjera)
      const clanovi = dostupniIgraci.slice(0, brojClanova);
      clanovi.forEach((k) => iskorisceniIgraciPoIgri.get(igra.id).add(k.id));

      const tim = await Tim.create({
        naziv: generisiNazivTima(), igra_id: igra.id, opis: nasumicno(glavniOpisi),
        kapiten_id: clanovi[0].id, trazi_igrace: Math.random() < 0.3, grb: nasumicniGrb(),
      });
      await ClanTima.bulkCreate(clanovi.map((k) => ({ tim_id: tim.id, korisnik_id: k.id })));
      for (const k of clanovi) await dodajUTimskiChat(tim.id, k.id);

      timoviPoIgri.get(igra.id).push(tim);
      clanoviMap.set(tim, clanovi);
      svaTimovi.push(tim);
    }
  }
  console.log(`Napravljeno ${svaTimovi.length} timova.`);

  // ============================================================
  // NAMJENSKI TIMOVI ZA IZLOG NALOGE (Filip/Ana/Marko) — svako je KAPITEN 2 tima,
  // u DVIJE RAZLIČITE igre (nema šanse da se ova dva tima ikad sudare u meču),
  // i svaki tim ima i nekoliko običnih članova iz opšte grupe igrača.
  // ============================================================
  const izlogTimoviDef = [
    { izlog: izlogIgraci[0], nazivi: ['Filipova Falanga', 'Filipovi Fantomi'], igre: [cs2, dota2] },
    { izlog: izlogIgraci[1], nazivi: ['Anini Anđeli', 'Ana Elite Squad'], igre: [valorant, ow2] },
    { izlog: izlogIgraci[2], nazivi: ['Markov Kvintet', 'Marko Legion'], igre: [lol, rl] },
  ];
  for (const def of izlogTimoviDef) {
    for (let i = 0; i < def.igre.length; i++) {
      const igra = def.igre[i];
      const brojDodatnihClanova = nasumicniBroj(3, 5);
      const dostupniIgraci = izmijesaj(igraci).filter((k) => !iskorisceniIgraciPoIgri.get(igra.id).has(k.id));
      const dodatniClanovi = dostupniIgraci.slice(0, brojDodatnihClanova);
      dodatniClanovi.forEach((k) => iskorisceniIgraciPoIgri.get(igra.id).add(k.id));
      iskorisceniIgraciPoIgri.get(igra.id).add(def.izlog.id);

      const sviClanovi = [def.izlog, ...dodatniClanovi]; // izlog nalog je UVIJEK prvi = kapiten
      const tim = await Tim.create({
        naziv: def.nazivi[i], igra_id: igra.id, opis: 'Demo tim za prezentaciju platforme.',
        kapiten_id: def.izlog.id, trazi_igrace: true, grb: nasumicniGrb(),
      });
      await ClanTima.bulkCreate(sviClanovi.map((k) => ({ tim_id: tim.id, korisnik_id: k.id })));
      for (const k of sviClanovi) await dodajUTimskiChat(tim.id, k.id);

      timoviPoIgri.get(igra.id).push(tim);
      clanoviMap.set(tim, sviClanovi);
      svaTimovi.push(tim);
    }
  }
  console.log('Napravljeni namjenski timovi za izlog naloge (svaki je kapiten tačno 2 tima).');

  // ============================================================
  // ISTORIJA MEČEVA — bogata, za SVE timove, plus budući zakazani mečevi (kalendar)
  // ============================================================
  console.log('Generišem istoriju mečeva (ovo je najduži korak)...');
  // Provjera da dva tima NEMAJU zajedničkog člana prije zakazivanja meča između njih —
  // "izlog" igrači su naknadno dodati u DVA dodatna tima iste igre, pa teoretski mogu
  // da završe u timovima koji bi inače bili upareni; ovo sprečava sudar (UNIQUE greška).
  function timoviSeSudaraju(timA, timB) {
    const clanoviA = clanoviMap.get(timA) || [];
    const clanoviB = clanoviMap.get(timB) || [];
    return clanoviA.some((a) => clanoviB.some((b) => b.id === a.id));
  }
  const obradjeniParovi = new Set();
  let ukupnoMeceva = 0;
  let ukupnoBuducih = 0;

  for (const igra of igre) {
    const timoviIgre = timoviPoIgri.get(igra.id);
    for (const timA of timoviIgre) {
      const brojProtivnika = nasumicniBroj(2, 4);
      const moguciProtivnici = izmijesaj(timoviIgre.filter((t) => t.id !== timA.id));
      let odabrano = 0;
      for (const timB of moguciProtivnici) {
        if (odabrano >= brojProtivnika) break;
        const kljuc = [timA.id, timB.id].sort((a, b) => a - b).join('-');
        if (obradjeniParovi.has(kljuc)) continue;
        if (timoviSeSudaraju(timA, timB)) continue; // preskoči par koji dijeli zajedničkog člana
        obradjeniParovi.add(kljuc);
        odabrano++;

        // 2-3 odigrana meča po paru, razmazana kroz poslednjih ~5 mjeseci, mješoviti ishodi
        const brojMeceva = nasumicniBroj(2, 3);
        const ishodi = Array.from({ length: brojMeceva }, () => nasumicno(['tim1', 'tim1', 'tim2', 'tim2', 'nerijeseno']));
        await napraviSeriju(timA, timB, ishodi, nasumicniBroj(30, 150), nasumicniBroj(2, 25), clanoviMap.get(timA), clanoviMap.get(timB));
        ukupnoMeceva += brojMeceva;

        // ~40% šanse i za budući, zakazan meč (puni kalendar)
        if (Math.random() < 0.4) {
          await napraviBuduciMec(timA, timB, nasumicniBroj(1, 20), clanoviMap.get(timA), clanoviMap.get(timB));
          ukupnoBuducih++;
        }
      }
    }
  }
  console.log(`Napravljeno ${ukupnoMeceva} odigranih mečeva i ${ukupnoBuducih} budućih zakazanih mečeva.`);

  // Nekoliko posebnih "spornih" mečeva (za admin panel) — kapiteni se ne slažu oko ishoda.
  const sporniPrimjeri = [];
  for (const igra of [cs2, valorant, lol]) {
    const timoviIgre = timoviPoIgri.get(igra.id);
    if (timoviIgre.length < 2) continue;
    const parIzmijesan = izmijesaj(timoviIgre);
    let timA = parIzmijesan[0];
    let timB = parIzmijesan.find((t) => t.id !== timA.id && !timoviSeSudaraju(timA, t));
    if (!timB) continue; // (izuzetno malo vjerovatno) nema nesukobljenog para za ovu igru
    const zahtjev = await ScrimZahtjev.create({
      tim_posiljalac_id: timA.id, tim_primalac_id: timB.id,
      predlozeni_termin: danaUnazad(nasumicniBroj(1, 4)), broj_mapa: 3, pravila: 'Best of 3.', status: 'prihvacen',
    });
    const mec = await ScrimMec.create({
      zahtjev_id: zahtjev.id, tim1_id: timA.id, tim2_id: timB.id,
      zakazano_za: zahtjev.predlozeni_termin, status: 'sporno', glas_tim1: 'pobjeda', glas_tim2: 'pobjeda',
    });
    const prisustva = [
      ...clanoviMap.get(timA).map((k) => ({ mec_id: mec.id, korisnik_id: k.id, tim_id: timA.id, status: 'moze' })),
      ...clanoviMap.get(timB).map((k) => ({ mec_id: mec.id, korisnik_id: k.id, tim_id: timB.id, status: 'moze' })),
    ];
    await PrisustvoMeca.bulkCreate(prisustva);
    sporniPrimjeri.push({ mec, timA, timB });
  }

  // ============================================================
  // TURNIRI — 15 ukupno: neki završeni, neki u toku, neki tek otvoreni za prijave
  // ============================================================
  console.log('Generišem turnire...');

  // Simulira bracket od "brojTimova" (mora biti stepen dvojke: 4 ili 8) i odigrava "rundiOdigrati" rundi.
  async function napraviTurnirSaBracketom(naziv, igra, brojTimova, rundiOdigrati, danaDoPocetka) {
    const timoviPula = timoviPoIgri.get(igra.id);
    if (timoviPula.length < brojTimova) return null;
    const timoviZaTurnir = izmijesaj(timoviPula).slice(0, brojTimova);
    const brojRundi = Math.log2(brojTimova);
    const gotovoSveOdigrano = rundiOdigrati >= brojRundi;

    const turnir = await Turnir.create({
      naziv, igra_id: igra.id,
      datum: danaDoPocetka >= 0 ? danaUnazad(-danaDoPocetka) : danaUnazad(-danaDoPocetka),
      max_timova: brojTimova, format: 'single_elimination',
      status: gotovoSveOdigrano ? 'zavrsen' : (rundiOdigrati > 0 ? 'u_toku' : 'prijave_otvorene'),
    });
    await TurnirPrijava.bulkCreate(timoviZaTurnir.map((t) => ({ turnir_id: turnir.id, tim_id: t.id })));
    if (rundiOdigrati === 0) return turnir;

    const rundeSlotovi = [];
    for (let runda = 1; runda <= brojRundi; runda++) {
      const brojMeceva = brojTimova / Math.pow(2, runda);
      const slotovi = [];
      for (let poz = 1; poz <= brojMeceva; poz++) slotovi.push(await RasporedTurnira.create({ turnir_id: turnir.id, runda_broj: runda, pozicija_u_rundi: poz }));
      rundeSlotovi.push(slotovi);
    }
    for (let r = 0; r < rundeSlotovi.length - 1; r++) {
      for (let i = 0; i < rundeSlotovi[r].length; i++) {
        await rundeSlotovi[r][i].update({ sledeci_slot_id: rundeSlotovi[r + 1][Math.floor(i / 2)].id });
      }
    }
    for (let i = 0; i < timoviZaTurnir.length; i += 2) {
      await rundeSlotovi[0][i / 2].update({ tim1_id: timoviZaTurnir[i].id, tim2_id: timoviZaTurnir[i + 1].id });
    }

    let danOdigravanja = Math.max(danaDoPocetka, brojRundi * 3) ;
    for (let r = 0; r < rundiOdigrati; r++) {
      const jeFinalnaRunda = r === brojRundi - 1;
      for (const slot of rundeSlotovi[r]) {
        await slot.reload();
        if (!slot.tim1_id || !slot.tim2_id) continue;
        const pobjednikId = Math.random() < 0.5 ? slot.tim1_id : slot.tim2_id;
        const ishod = pobjednikId === slot.tim1_id ? 'tim1' : 'tim2';
        const mec = await ScrimMec.create({
          tim1_id: slot.tim1_id, tim2_id: slot.tim2_id, turnir_id: turnir.id, runda_broj: slot.runda_broj,
          zakazano_za: danaUnazad(danOdigravanja), pobjednik_tim_id: pobjednikId, ishod, status: 'odigran',
          rezultat: Math.random() < 0.5 ? '2-1' : '2-0', bonus_poena: jeFinalnaRunda ? 15 : 0,
        });
        await slot.update({ mec_id: mec.id });
        if (slot.sledeci_slot_id) {
          const sledeciSlot = await RasporedTurnira.findByPk(slot.sledeci_slot_id);
          const jeParan = slot.pozicija_u_rundi % 2 === 1;
          if (jeParan) await sledeciSlot.update({ tim1_id: pobjednikId }); else await sledeciSlot.update({ tim2_id: pobjednikId });
        } else if (jeFinalnaRunda) {
          await turnir.update({ status: 'zavrsen' });
          const dostignuce = await Dostignuce.findOne({ where: { uslov_tip: 'osvojen_turnir' } });
          const clanovi = await ClanTima.findAll({ where: { tim_id: pobjednikId } });
          for (const c of clanovi) {
            if (dostignuce) await KorisnikDostignuce.findOrCreate({ where: { korisnik_id: c.korisnik_id, dostignuce_id: dostignuce.id } });
            await Notifikacija.create({
              korisnik_id: c.korisnik_id, tip: 'turnir_pocinje',
              poruka: `Čestitamo! Vaš tim je osvojio turnir "${turnir.naziv}" i dobija 15 bonus poena na rang listi.`,
              link_entitet_tip: 'tim', link_entitet_id: pobjednikId, procitano: false,
            });
          }
        }
      }
      danOdigravanja -= Math.ceil(danOdigravanja / (brojRundi - r + 1));
      if (danOdigravanja < 0) danOdigravanja = 0;
    }
    return turnir;
  }

  // 15 turnira: 3 po LoL/CS2/Valorant (1 završen, 1 u toku, 1 tek otvoren), i po 1 za ostalih 9 igara.
  const turniriZaNapraviti = [
    ['ScrimFinder Kup — Jesen 2026', lol, 8, 3, -10],
    ['LoL Regionalna Liga', lol, 4, 1, -3],
    ['LoL Zimski Kvalifikacioni', lol, 8, 0, 12],
    ['CS2 Crnogorski Šampionat', cs2, 8, 3, -14],
    ['CS2 Balkan Skirmish', cs2, 4, 1, -4],
    ['CS2 Prolećni Kup', cs2, 8, 0, 18],
    ['Valorant Masters Podgorica', valorant, 8, 3, -20],
    ['Valorant Ignite Cup', valorant, 4, 1, -2],
    ['Valorant Rookie Kup', valorant, 8, 0, 9],
    ['Dota 2 Primorski Kup', dota2, 4, 1, -6],
    ['Rainbow Six Adria Kup', r6, 4, 1, -5],
    ['Rocket League 3v3 Šampionat', rl, 4, 1, -8],
    ['EA FC Solo Kup', fifa, 4, 0, 15],
    ['Overwatch 2 Kontrola Kup', ow2, 4, 1, -5],
    ['PUBG Squad Showdown', pubg, 4, 0, 22],
    ['Apex Legends Trios Kup', apex, 4, 1, -7],
  ];
  let napravljenoTurnira = 0;
  for (const [naziv, igra, brojTimova, rundi, dana] of turniriZaNapraviti) {
    const rezultat = await napraviTurnirSaBracketom(naziv, igra, brojTimova, rundi, dana);
    if (rezultat) napravljenoTurnira++;
  }
  console.log(`Napravljeno ${napravljenoTurnira} turnira.`);

  // ============================================================
  // CHAT — bogata istorija za sva 3 "izloška" naloga (timski chatovi su već automatski
  // napravljeni pri kreiranju timova) + direktne poruke + chat sa adminom sa slikom-dokazom
  // ============================================================
  console.log('Generišem chat poruke...');

  const timskePorukePrimjeri = [
    'Ekipo, trening večeras kao i obično?', 'Može, stižem.', 'Ja kasnim 10-ak minuta.',
    'Fokus na draft/strategiju danas.', 'Skinuo/la sam replay poslednjeg meča, pogledajte prije treninga.',
    'Sredio/la sam termin za sledeći skrim.', 'Idemo malo ranije da zagrijemo.', 'Slažem se, previše smo predvidivi zadnje vrijeme.',
    'GG od juče, dobra igra svih.', 'Ko može sjutra u 19h?',
  ];
  // Ubaci nekoliko poruka u par timskih chatova gdje su izlog igrači članovi.
  for (const izlog of izlogIgraci) {
    const clanstva = await ClanTima.findAll({ where: { korisnik_id: izlog.id } });
    for (const clanstvo of izmijesaj(clanstva).slice(0, 3)) {
      const konv = await Konverzacija.findOne({ where: { tim_id: clanstvo.tim_id, tip: 'tim' } });
      if (!konv) continue;
      const clanoviTima = await ClanTima.findAll({ where: { tim_id: clanstvo.tim_id } });
      let t = danaUnazad(4, 18);
      const zapisi = [];
      for (let i = 0; i < nasumicniBroj(3, 6); i++) {
        const posiljalacId = nasumicno(clanoviTima).korisnik_id;
        zapisi.push({ konverzacija_id: konv.id, posiljalac_id: posiljalacId, tekst: nasumicno(timskePorukePrimjeri), created_at: new Date(t.getTime() + i * 7 * 60 * 1000) });
      }
      await Poruka.bulkCreate(zapisi);
    }
  }

  // Direktne poruke — nekoliko prihvaćenih razgovora između izlog igrača i nasumičnih drugih.
  async function napraviDM(a, b, poruke) {
    const konv = await Konverzacija.create({ tip: 'direktna' });
    await ClanKonverzacije.create({ konverzacija_id: konv.id, korisnik_id: a.id, status: 'prihvacena', poslednje_procitano_at: new Date() });
    await ClanKonverzacije.create({ konverzacija_id: konv.id, korisnik_id: b.id, status: 'prihvacena', poslednje_procitano_at: new Date() });
    let t = danaUnazad(2, 12);
    const zapisi = poruke.map(([posiljalac, tekst, slika], idx) => ({
      konverzacija_id: konv.id, posiljalac_id: posiljalac.id, tekst: tekst || null, slika: slika || null,
      created_at: new Date(t.getTime() + idx * 4 * 60 * 1000),
    }));
    await Poruka.bulkCreate(zapisi);
    return konv;
  }

  for (const izlog of izlogIgraci) {
    const sagovornik = nasumicno(igraci.filter((k) => k.id !== izlog.id));
    await napraviDM(izlog, sagovornik, [
      [izlog, 'Ćao, jeste za scrim ovog vikenda?'],
      [sagovornik, 'Jesmo, pošalji zahtjev pa se dogovaramo.'],
      [izlog, 'Poslao/la sam, pogledaj kad stigneš.'],
    ]);
  }

  // DM zahtjev na čekanju (demonstrira tab "Zahtjevi") — nekom drugom igraču piše prvi put.
  const primalacZahtjeva = nasumicno(igraci.filter((k) => k.id !== izlogIgraci[0].id));
  const dmZahtjev = await Konverzacija.create({ tip: 'direktna' });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev.id, korisnik_id: izlogIgraci[0].id, status: 'prihvacena', poslednje_procitano_at: new Date() });
  await ClanKonverzacije.create({ konverzacija_id: dmZahtjev.id, korisnik_id: primalacZahtjeva.id, status: 'na_cekanju' });
  await Poruka.create({ konverzacija_id: dmZahtjev.id, posiljalac_id: izlogIgraci[0].id, tekst: 'Ćao, vidio/la sam da tražite igrače — igram i ja tu igru!' });
  await Notifikacija.create({ korisnik_id: primalacZahtjeva.id, tip: 'poruka_zahtjev', poruka: `${izlogIgraci[0].ime} vam je poslao/la zahtjev za poruku.`, procitano: false });

  // ---- Chat sa adminom — screenshot dokaz spornog meča (traženo posebno) ----
  if (sporniPrimjeri.length > 0) {
    const spor = sporniPrimjeri[0];
    const kapitenA = await Korisnik.findByPk(spor.timA.kapiten_id);
    const slikaDokaza = napraviSlikuDokaza('SCOREBOARD — KRAJ MEČA', `Pobjednik: ${spor.timA.naziv}`, 'Rezultat: 2-1 (potvrđeno od strane oba tima uživo)');
    await napraviDM(kapitenA, admin, [
      [kapitenA, `Zdravo, šaljem dokaz za sporni meč protiv ${spor.timB.naziv} — pobijedili smo mi.`],
      [kapitenA, null, slikaDokaza],
      [admin, 'Primio sam, hvala — pogledaću i riješiti spor u admin panelu.'],
    ]);
  }

  // ============================================================
  // KOMENTARI I LAJKOVI (na nekoliko nasumičnih timova)
  // ============================================================
  for (const tim of izmijesaj(svaTimovi).slice(0, 15)) {
    const autor = nasumicno(igraci);
    const komentar = await Komentar.create({ autor_id: autor.id, entitet_tip: 'tim', entitet_id: tim.id, tekst: nasumicno([
      'Odigrali smo protiv njih, veoma organizovan tim!', 'Traže li ovi još skrimove ovog mjeseca?', 'Dobra igra, preporučujem za skrimove.', 'Jak sastav, teško se igra protiv njih.',
    ]) });
    for (const lajkodavac of izmijesaj(igraci).slice(0, nasumicniBroj(0, 5))) {
      await KomentarLajk.findOrCreate({ where: { komentar_id: komentar.id, korisnik_id: lajkodavac.id } });
    }
  }

  // ============================================================
  // DOSTIGNUĆA
  // ============================================================
  await Dostignuce.create({ naziv: 'Prvih 10 mečeva', opis: 'Prisustvujte na 10 skrim mečeva.', uslov_tip: 'odigranih_meceva', uslov_vrijednost: 10 });
  const d2 = await Dostignuce.create({ naziv: 'Prva pobjeda', opis: 'Prisustvujte meču koji vaš tim pobijedi.', uslov_tip: 'pobjeda', uslov_vrijednost: 1 });
  await Dostignuce.create({ naziv: 'Dominacija', opis: 'Win rate tima od 70% u mečevima kojima ste prisustvovali (min. 5).', uslov_tip: 'win_rate', uslov_vrijednost: 70 });
  await Dostignuce.create({ naziv: 'Šampion turnira', opis: 'Osvojite turnir na platformi.', uslov_tip: 'osvojen_turnir', uslov_vrijednost: 1 });
  await KorisnikDostignuce.findOrCreate({ where: { korisnik_id: izlogIgraci[0].id, dostignuce_id: d2.id } });

  // ============================================================
  // ZAVRŠNI ISPIS
  // ============================================================
  console.log('\n\n======================================================================');
  console.log(' GOTOVO! Baza je popunjena velikim setom test podataka.');
  console.log('======================================================================');
  console.log(` Igrača: ${igraci.length + 1} (uključujući admina)`);
  console.log(` Timova: ${svaTimovi.length}`);
  console.log(` Turnira: ${napravljenoTurnira}`);
  console.log(` Odigranih mečeva: ${ukupnoMeceva}+ | Budućih zakazanih: ${ukupnoBuducih}`);
  console.log('======================================================================');
  console.log(' NALOZI ZA PRIJAVU — lozinka za SVE naloge: lozinka123');
  console.log('----------------------------------------------------------------------');
  console.log(` ADMIN     ${admin.email}`);
  console.log('----------------------------------------------------------------------');
  console.log(' Ova tri naloga imaju NAJVIŠE timova i najbogatiju chat istoriju:');
  for (const izlog of izlogIgraci) {
    const brojTimova = await ClanTima.count({ where: { korisnik_id: izlog.id } });
    console.log(` ${izlog.ime.padEnd(22)} ${izlog.email.padEnd(32)} (${brojTimova} timova)`);
  }
  console.log('======================================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Greška prilikom seed-ovanja:', err);
  process.exit(1);
});