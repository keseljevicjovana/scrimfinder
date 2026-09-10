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

function napraviSlikuDokaza(naslov, linija1, linija2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240">
    <rect width="420" height="240" fill="#0d0a16"/>
    <rect x="8" y="8" width="404" height="224" fill="none" stroke="#00f0ff" stroke-width="2"/>
    <text x="30" y="50" fill="#ffe14d" font-family="monospace" font-size="18" font-weight="bold">${naslov}</text>
    <text x="30" y="100" fill="#f1eaff" font-family="monospace" font-size="14">${linija1}</text>
    <text x="30" y="130" fill="#f1eaff" font-family="monospace" font-size="14">${linija2}</text>
    <text x="30" y="200" fill="#9c8fc2" font-family="monospace" font-size="11">screenshot-dokaz.png</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Pomoćna funkcija za bezbjedno kreiranje prisustva bez duplikata po korisniku
async function upisiPrisustvaZaMec(mecId, timA, clanoviA, timB, clanoviB, statusB = 'moze') {
  const dodatiKorisnici = new Set();
  const prisustva = [];

  for (const k of clanoviA) {
    if (!dodatiKorisnici.has(k.id)) {
      dodatiKorisnici.add(k.id);
      prisustva.push({ mec_id: mecId, korisnik_id: k.id, tim_id: timA.id, status: 'moze' });
    }
  }

  for (const k of clanoviB) {
    if (!dodatiKorisnici.has(k.id)) {
      dodatiKorisnici.add(k.id);
      prisustva.push({ mec_id: mecId, korisnik_id: k.id, tim_id: timB.id, status: statusB });
    }
  }

  if (prisustva.length > 0) {
    await PrisustvoMeca.bulkCreate(prisustva);
  }
}

async function seed() {
  await sequelize.sync({ force: true });
  console.log('Baza je resetovana. Generišem podatke...');

  const lozinkaHash = await bcrypt.hash('lozinka123', 10);

  // ============================================================
  // 1. IGRE I POZICIJE
  // ============================================================
  const igreDef = [
    { naziv: 'League of Legends', pozicije: ['Top', 'Jungle', 'Mid', 'Bot', 'Support'] },
    { naziv: 'Counter-Strike 2', pozicije: null },
    { naziv: 'Valorant', pozicije: ['Duelist', 'Controller', 'Sentinel', 'Initiator'] },
    { naziv: 'Dota 2', pozicije: ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'] },
    { naziv: 'Rocket League', pozicije: null },
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

  // ============================================================
  // 2. KORISNICI (TAČNO 30 IGRAČA + ADMIN)
  // ============================================================
  const admin = await Korisnik.create({
    ime: 'Admin Marko', email: 'admin@scrimfinder.me', lozinka_hash: lozinkaHash, uloga: 'admin',
    pol: 'muski', avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false,
  });

  const triGlavna = [
    { ime: 'Filip Vujović', email: 'filip.vujovic@scrimfinder.me', pol: 'muski' },
    { ime: 'Ana Radulović', email: 'ana.radulovic@scrimfinder.me', pol: 'zenski' },
    { ime: 'Marko Backović', email: 'marko.backovic@scrimfinder.me', pol: 'muski' },
  ];

  const imenaMuska = ['Nikola', 'Stefan', 'Miloš', 'Aleksandar', 'Luka', 'Vuk', 'Uroš', 'Bogdan', 'Petar', 'Nemanja', 'Dušan', 'Đorđe', 'Filip', 'Ognjen', 'Lazar'];
  const imenaZenska = ['Jovana', 'Milica', 'Ivana', 'Tijana', 'Ana', 'Jelena', 'Marija', 'Teodora', 'Katarina', 'Sara', 'Milena', 'Nina'];
  const prezimena = ['Petrović', 'Ilić', 'Stojanović', 'Đorđević', 'Marković', 'Pavlović', 'Popović', 'Nikolić', 'Jovanović', 'Vujović', 'Radulović', 'Vukotić'];

  const igraci = [];
  for (const p of triGlavna) {
    const k = await Korisnik.create({
      ime: p.ime, email: p.email, lozinka_hash: lozinkaHash, pol: p.pol,
      avatar: generisiNasumicniAvatar(p.pol), mora_promijeniti_lozinku: false, bio: 'Glavni test nalog na platformi.'
    });
    igraci.push(k);
  }

  while (igraci.length < 30) {
    const pol = Math.random() < 0.7 ? 'muski' : 'zenski';
    const ime = pol === 'muski' ? nasumicno(imenaMuska) : nasumicno(imenaZenska);
    const prezime = nasumicno(prezimena);
    const email = `${ocisti(ime)}.${ocisti(prezime)}${igraci.length}@scrimfinder.me`;
    const k = await Korisnik.create({
      ime: `${ime} ${prezime}`, email, lozinka_hash: lozinkaHash, pol,
      avatar: generisiNasumicniAvatar(pol), mora_promijeniti_lozinku: false, bio: 'Takmičarski igrač.'
    });
    igraci.push(k);
  }

  for (const k of igraci) {
    for (const igra of izmijesaj(igre).slice(0, 2)) {
      await ProfilIgraca.create({ korisnik_id: k.id, igra_id: igra.id, pozicija_id: igra.ima_pozicije ? nasumicno(Object.values(igra.pozicijeObj)).id : null });
    }
    await Dostupnost.create({ korisnik_id: k.id, dan_u_sedmici: nasumicniBroj(1, 5), vrijeme_od: '18:00:00', vrijeme_do: '22:00:00' });
  }

  // ============================================================
  // 3. TIMOVI (TAČNO 20 TIMOVA — SVI ČLANOVI U 4 TIMA, KAPITENI U BAR 1)
  // ============================================================
  const naziviTimova = [
    'Podgoričke Mange', 'Nikšićki Vukovi', 'Cetinjski Orlovi', 'Budvanski Titani',
    'Barske Ajkule', 'Kotorski Gusari', 'Beogradske Mambe', 'Novosadski Gromovi',
    'Bokeljski Risovi', 'Pljevaljski Zmajevi', 'Tivatski Lavovi', 'Beranski Medvedi',
    'Danilovgradske Mure', 'Hercegnovski Valovi', 'Žabljački Vukovi', 'Ulcinjski Fenixi',
    'Bjelopoljski Jastrebovi', 'Kolašinski Snajperi', 'Mojkovački Ratnici', 'Sutjeska Esports'
  ];

  const svaTimovi = [];
  const clanoviMap = new Map();
  const timoviPoIgri = new Map();
  for (const ig of igre) timoviPoIgri.set(ig.id, []);

  // Određujemo 20 kapitena (prvih 20 igrača u nizu)
  for (let i = 0; i < 20; i++) {
    const igra = igre[i % igre.length];
    const tim = await Tim.create({
      naziv: naziviTimova[i], igra_id: igra.id, opis: 'Zvanični tim sa kompletnim sastavom.',
      kapiten_id: igraci[i].id, trazi_igrace: Math.random() < 0.3,
      grb: { oblik: 'stit', pozadina: '#1a1330', simbol: 'zmaj', simbolBoja: '#00f0ff' }
    });
    svaTimovi.push(tim);
    timoviPoIgri.get(igra.id).push(tim);
  }

  // Svaki igrač je u 4 tima ukupno
  const timoviBrojac = new Map(igraci.map(k => [k.id, 0]));
  const clanoviTimaSet = new Map(svaTimovi.map(t => [t.id, new Set([t.kapiten_id])]));
  svaTimovi.forEach(t => timoviBrojac.set(t.kapiten_id, timoviBrojac.get(t.kapiten_id) + 1));

  for (const k of igraci) {
    while (timoviBrojac.get(k.id) < 4) {
      const slobodniTimovi = svaTimovi.filter(t => !clanoviTimaSet.get(t.id).has(k.id) && clanoviTimaSet.get(t.id).size < 6);
      if (slobodniTimovi.length === 0) break;
      const izabraniTim = nasumicno(slobodniTimovi);
      clanoviTimaSet.get(izabraniTim.id).add(k.id);
      timoviBrojac.set(k.id, timoviBrojac.get(k.id) + 1);
    }
  }

  for (const tim of svaTimovi) {
    const clanoviIds = Array.from(clanoviTimaSet.get(tim.id));
    const clanoviObj = igraci.filter(k => clanoviIds.includes(k.id));
    clanoviMap.set(tim, clanoviObj);

    await ClanTima.bulkCreate(clanoviIds.map(kid => ({ tim_id: tim.id, korisnik_id: kid })));
    for (const kid of clanoviIds) await dodajUTimskiChat(tim.id, kid);
  }

  // ============================================================
  // 4. MEČEVI (ISTORIJA ODIGRANIH + BUDUĆI ZAKAZANI)
  // ============================================================
  let ukupnoOdigranih = 0;
  let ukupnoZakazanih = 0;

  for (const igra of igre) {
    const timovi = timoviPoIgri.get(igra.id);
    for (let i = 0; i < timovi.length; i++) {
      for (let j = i + 1; j < timovi.length; j++) {
        const t1 = timovi[i];
        const t2 = timovi[j];

        // Odigrani mečevi
        const brOdigranih = nasumicniBroj(1, 2);
        for (let m = 0; m < brOdigranih; m++) {
          const ishod = nasumicno(['tim1', 'tim2', 'nerijeseno']);
          const z = await ScrimZahtjev.create({
            tim_posiljalac_id: t1.id, tim_primalac_id: t2.id,
            predlozeni_termin: danaUnazad(nasumicniBroj(3, 40)), broj_mapa: 3, pravila: 'Standard', status: 'prihvacen'
          });
          const mec = await ScrimMec.create({
            zahtjev_id: z.id, tim1_id: t1.id, tim2_id: t2.id, zakazano_za: z.predlozeni_termin,
            status: 'odigran', ishod, pobjednik_tim_id: ishod === 'tim1' ? t1.id : ishod === 'tim2' ? t2.id : null,
            rezultat: ishod === 'nerijeseno' ? '1-1' : '2-1'
          });
          
          await upisiPrisustvaZaMec(mec.id, t1, clanoviMap.get(t1), t2, clanoviMap.get(t2), 'moze');
          ukupnoOdigranih++;
        }

        // Budući meč
        if (Math.random() < 0.6) {
          const termin = danaUnazad(-nasumicniBroj(2, 12));
          const z = await ScrimZahtjev.create({
            tim_posiljalac_id: t1.id, tim_primalac_id: t2.id,
            predlozeni_termin: termin, broj_mapa: 3, pravila: 'Bo3', status: 'prihvacen'
          });
          const mec = await ScrimMec.create({ zahtjev_id: z.id, tim1_id: t1.id, tim2_id: t2.id, zakazano_za: termin, status: 'zakazan' });
          await upisiPrisustvaZaMec(mec.id, t1, clanoviMap.get(t1), t2, clanoviMap.get(t2), 'na_cekanju');
          ukupnoZakazanih++;
        }
      }
    }
  }

  // Sporni meč za Admin panel
  const sporniT1 = svaTimovi[0];
  const sporniT2 = svaTimovi[1];
  const zSporni = await ScrimZahtjev.create({
    tim_posiljalac_id: sporniT1.id, tim_primalac_id: sporniT2.id,
    predlozeni_termin: danaUnazad(1), broj_mapa: 3, pravila: 'Bo3', status: 'prihvacen'
  });
  const mecSporni = await ScrimMec.create({
    zahtjev_id: zSporni.id, tim1_id: sporniT1.id, tim2_id: sporniT2.id,
    zakazano_za: zSporni.predlozeni_termin, status: 'sporno', glas_tim1: 'pobjeda', glas_tim2: 'pobjeda'
  });
  await upisiPrisustvaZaMec(mecSporni.id, sporniT1, clanoviMap.get(sporniT1), sporniT2, clanoviMap.get(sporniT2), 'moze');

  // ============================================================
  // 5. TURNIRI (15 UKUPNO — PROŠLI, U TOKU, PREDSTOJEĆI)
  // ============================================================
  const turniriDef = [
    { naziv: 'LoL Jesenji Kup 2026', igra: igre[0], status: 'zavrsen', dana: 20 },
    { naziv: 'LoL Balkan Masters', igra: igre[0], status: 'u_toku', dana: 2 },
    { naziv: 'LoL Zimski Turnir', igra: igre[0], status: 'prijave_otvorene', dana: -10 },
    { naziv: 'CS2 Pro League', igra: igre[1], status: 'zavrsen', dana: 30 },
    { naziv: 'CS2 Adria Open', igra: igre[1], status: 'u_toku', dana: 1 },
    { naziv: 'CS2 Major Podgorica', igra: igre[1], status: 'prijave_otvorene', dana: -15 },
    { naziv: 'Valorant Champions', igra: igre[2], status: 'zavrsen', dana: 25 },
    { naziv: 'Valorant Ignite', igra: igre[2], status: 'u_toku', dana: 3 },
    { naziv: 'Valorant Rising Stars', igra: igre[2], status: 'prijave_otvorene', dana: -8 },
    { naziv: 'Dota 2 International Kup', igra: igre[3], status: 'zavrsen', dana: 15 },
    { naziv: 'Dota 2 Summer Clash', igra: igre[3], status: 'u_toku', dana: 1 },
    { naziv: 'Dota 2 Winter Showdown', igra: igre[3], status: 'prijave_otvorene', dana: -20 },
    { naziv: 'Rocket League 3v3 League', igra: igre[4], status: 'zavrsen', dana: 18 },
    { naziv: 'Rocket League Masters', igra: igre[4], status: 'u_toku', dana: 2 },
    { naziv: 'Rocket League Open Cup', igra: igre[4], status: 'prijave_otvorene', dana: -5 }
  ];

  for (const tDef of turniriDef) {
    const turnir = await Turnir.create({
      naziv: tDef.naziv, igra_id: tDef.igra.id, datum: danaUnazad(tDef.dana),
      max_timova: 4, format: 'single_elimination', status: tDef.status
    });
    const timoviIgre = timoviPoIgri.get(tDef.igra.id);
    if (timoviIgre.length >= 2) {
      await TurnirPrijava.bulkCreate([
        { turnir_id: turnir.id, tim_id: timoviIgre[0].id },
        { turnir_id: turnir.id, tim_id: timoviIgre[1].id }
      ]);
    }
  }

  // ============================================================
  // 6. CHAT SA ADMINOM I DOSTIGNUĆA
  // ============================================================
  const kapitenSpornog = igraci.find(k => k.id === sporniT1.kapiten_id);
  const konv = await Konverzacija.create({ tip: 'direktna' });
  await ClanKonverzacije.bulkCreate([
    { konverzacija_id: konv.id, korisnik_id: kapitenSpornog.id, status: 'prihvacena' },
    { konverzacija_id: konv.id, korisnik_id: admin.id, status: 'prihvacena' }
  ]);
  const slikaDokaza = napraviSlikuDokaza('DOKAZ O POBJEDI', `Tim: ${sporniT1.naziv}`, 'Rezultat: 2-1 (potvrđeno)');
  await Poruka.bulkCreate([
    { konverzacija_id: konv.id, posiljalac_id: kapitenSpornog.id, tekst: 'Pozdrav, poslao sam dokaz za sporni meč u prilogu.' },
    { konverzacija_id: konv.id, posiljalac_id: kapitenSpornog.id, slika: slikaDokaza },
    { konverzacija_id: konv.id, posiljalac_id: admin.id, tekst: 'Uredu, pregledaću i riješiti u admin panelu.' }
  ]);

  await Dostignuce.create({ naziv: 'Prvih 10 mečeva', opis: 'Prisustvujte na 10 skrim mečeva.', uslov_tip: 'odigranih_meceva', uslov_vrijednost: 10 });
  const dPobjeda = await Dostignuce.create({ naziv: 'Prva pobjeda', opis: 'Pobijedite u skrim meču.', uslov_tip: 'pobjeda', uslov_vrijednost: 1 });
  await KorisnikDostignuce.findOrCreate({ where: { korisnik_id: igraci[0].id, dostignuce_id: dPobjeda.id } });

  console.log('\n======================================================================');
  console.log(' SEED USPJEŠNO ZAVRŠEN!');
  console.log('======================================================================');
  console.log(` Ukupno igrača: ${igraci.length} (svaki u TAČNO 4 tima i kapiten u bar 1)`);
  console.log(` Ukupno timova: ${svaTimovi.length}`);
  console.log(` Odigranih mečeva: ${ukupnoOdigranih} | Zakazanih: ${ukupnoZakazanih}`);
  console.log(` Ukupno turnira: ${turniriDef.length}`);
  console.log('======================================================================');
  console.log(' 3 GLAVNA TEST NALOGA (Lozinka za sve: lozinka123):');
  console.log(` 1. ${triGlavna[0].email}`);
  console.log(` 2. ${triGlavna[1].email}`);
  console.log(` 3. ${triGlavna[2].email}`);
  console.log(' ADMIN NALOG:');
  console.log(` admin@scrimfinder.me (Lozinka: lozinka123)`);
  console.log('======================================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Greška prilikom seed-ovanja:', err);
  process.exit(1);
});