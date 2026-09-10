require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');
const {
  Korisnik, Igra, Pozicija, ProfilIgraca, Dostupnost, Tim, ClanTima,
  ScrimZahtjev, ScrimMec, PrisustvoMeca, Dostignuce, KorisnikDostignuce,
  Turnir, TurnirPrijava, Konverzacija, ClanKonverzacije, Poruka,
} = require('../models');
const { generisiNasumicniAvatar } = require('../utils/avatarOptions');

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

  const lolIgra = igre[0]; // League of Legends

  // ============================================================
  // 2. KORISNICI (30 IGRAČA SA 3 SPECIFIČNA)
  // ============================================================
  const admin = await Korisnik.create({
    ime: 'Admin Marko', email: 'admin@scrimfinder.me', lozinka_hash: lozinkaHash, uloga: 'admin',
    pol: 'muski', avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false,
  });

  const filip = await Korisnik.create({
    ime: 'Filip Vujović', email: 'filip.vujovic@scrimfinder.me', lozinka_hash: lozinkaHash, pol: 'muski',
    avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false, bio: 'Glavni organizator timova.'
  });
  const ana = await Korisnik.create({
    ime: 'Ana Radulović', email: 'ana.radulovic@scrimfinder.me', lozinka_hash: lozinkaHash, pol: 'zenski',
    avatar: generisiNasumicniAvatar('zenski'), mora_promijeniti_lozinku: false, bio: 'LoL Kapiten - Podgoričke Mange.'
  });
  const marko = await Korisnik.create({
    ime: 'Marko Backović', email: 'marko.backovic@scrimfinder.me', lozinka_hash: lozinkaHash, pol: 'muski',
    avatar: generisiNasumicniAvatar('muski'), mora_promijeniti_lozinku: false, bio: 'LoL Kapiten - Nikšićki Vukovi.'
  });

  const igraci = [filip, ana, marko];

  const imenaMuska = ['Nikola', 'Stefan', 'Miloš', 'Aleksandar', 'Luka', 'Vuk', 'Uroš', 'Bogdan', 'Petar', 'Nemanja', 'Dušan', 'Đorđe', 'Ognjen', 'Lazar'];
  const imenaZenska = ['Jovana', 'Milica', 'Ivana', 'Tijana', 'Jelena', 'Marija', 'Teodora', 'Katarina', 'Sara', 'Milena', 'Nina'];
  const prezimena = ['Petrović', 'Ilić', 'Stojanović', 'Đorđević', 'Marković', 'Pavlović', 'Popović', 'Nikolić', 'Jovanović', 'Vukotić'];

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
  // 3. TIMOVI (20 TIMOVA — ANA I MARKO KAPITENI U ISTOJ IGRI)
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

  // Tim 1: Ana Kapiten (League of Legends)
  const timAna = await Tim.create({
    naziv: naziviTimova[0], igra_id: lolIgra.id, opis: 'Glavni LoL tim iz Podgorice pod vodstvom Ane.',
    kapiten_id: ana.id, trazi_igrace: true, grb: { oblik: 'stit', pozadina: '#1a1330', simbol: 'zmaj', simbolBoja: '#00f0ff' }
  });
  svaTimovi.push(timAna); timoviPoIgri.get(lolIgra.id).push(timAna);

  // Tim 2: Marko Kapiten (ISTO League of Legends)
  const timMarko = await Tim.create({
    naziv: naziviTimova[1], igra_id: lolIgra.id, opis: 'Elitni LoL tim iz Nikšića pod vodstvom Marka.',
    kapiten_id: marko.id, trazi_igrace: false, grb: { oblik: 'krug', pozadina: '#30131a', simbol: 'vuk', simbolBoja: '#ff0055' }
  });
  svaTimovi.push(timMarko); timoviPoIgri.get(lolIgra.id).push(timMarko);

  // Tim 3: Filip Kapiten (CS2)
  const timFilip = await Tim.create({
    naziv: naziviTimova[2], igra_id: igre[1].id, opis: 'Taktički CS2 tim predvođen Filipom.',
    kapiten_id: filip.id, trazi_igrace: true, grb: { oblik: 'stit', pozadina: '#1a3013', simbol: 'orao', simbolBoja: '#55ff00' }
  });
  svaTimovi.push(timFilip); timoviPoIgri.get(igre[1].id).push(timFilip);

  // Generisanje preostalih 17 timova
  for (let i = 3; i < 20; i++) {
    const igra = igre[i % igre.length];
    const kapiten = igraci[i];
    const tim = await Tim.create({
      naziv: naziviTimova[i], igra_id: igra.id, opis: 'Takmičarski tim za scrim mečeve.',
      kapiten_id: kapiten.id, trazi_igrace: Math.random() < 0.3,
      grb: { oblik: 'stit', pozadina: '#1a1330', simbol: 'kruna', simbolBoja: '#ffe14d' }
    });
    svaTimovi.push(tim);
    timoviPoIgri.get(igra.id).push(tim);
  }

  // Organizacija članstava: Filip, Ana i Marko su u MINIMUM 3 RAZLIČITA TIMA
  const clanoviTimaSet = new Map(svaTimovi.map(t => [t.id, new Set([t.kapiten_id])]));

  // Dodajemo Anu, Marka i Filipa u još po 2 tima da imaju po 3 tima ukupno
  clanoviTimaSet.get(svaTimovi[3].id).add(ana.id);
  clanoviTimaSet.get(svaTimovi[4].id).add(ana.id);

  clanoviTimaSet.get(svaTimovi[5].id).add(marko.id);
  clanoviTimaSet.get(svaTimovi[6].id).add(marko.id);

  clanoviTimaSet.get(svaTimovi[7].id).add(filip.id);
  clanoviTimaSet.get(svaTimovi[8].id).add(filip.id);

  // Popunjavamo ostale timove sa igračima (4 do 6 po timu)
  for (const tim of svaTimovi) {
    const trenutniSet = clanoviTimaSet.get(tim.id);
    while (trenutniSet.size < 5) {
      const slobodanIgrac = nasumicno(igraci);
      trenutniSet.add(slobodanIgrac.id);
    }
  }

  // Upisujemo članove i kreiramo grupne chatove za svaki tim
  for (const tim of svaTimovi) {
    const clanoviIds = Array.from(clanoviTimaSet.get(tim.id));
    const clanoviObj = igraci.filter(k => clanoviIds.includes(k.id));
    clanoviMap.set(tim, clanoviObj);

    await ClanTima.bulkCreate(clanoviIds.map(kid => ({ tim_id: tim.id, korisnik_id: kid })));

    // Timski grupni chat
    const konv = await Konverzacija.create({ tip: 'tim', naziv: `Chat - ${tim.naziv}`, tim_id: tim.id });
    await ClanKonverzacije.bulkCreate(clanoviIds.map(kid => ({ konverzacija_id: konv.id, korisnik_id: kid, status: 'prihvacena' })));

    // Dodajemo početne poruke u timski chat
    await Poruka.bulkCreate([
      { konverzacija_id: konv.id, posiljalac_id: tim.kapiten_id, tekst: `Pozdrav ekipo! Dobrodošli u zvanični chat za ${tim.naziv}.` },
      { konverzacija_id: konv.id, posiljalac_id: clanoviIds[1], tekst: 'Pozdrav kapitene! Kada igramo sledeći skrim?' },
      { konverzacija_id: konv.id, posiljalac_id: tim.kapiten_id, tekst: 'Provjerite kalendar, zakazao sam trening meč.' }
    ]);
  }

  // ============================================================
  // 4. ZAHTJEVI NA ČEKANJU (ZA DEMONSTRACIJU PROFESORU)
  // ============================================================
  // Nekoliko timova šalje zahtjeve Aninom i Markovom timu (prihvat/odbijanje na uvid)
  const zZaAna = await ScrimZahtjev.create({
    tim_posiljalac_id: svaTimovi[9].id, tim_primalac_id: timAna.id,
    predlozeni_termin: danaUnazad(-2), broj_mapa: 3, pravila: 'Bo3 Tournament Standard', status: 'na_cekanju'
  });

  const zZaMarko = await ScrimZahtjev.create({
    tim_posiljalac_id: timAna.id, tim_primalac_id: timMarko.id,
    predlozeni_termin: danaUnazad(-3), broj_mapa: 3, pravila: 'Bo3 Elitni meč', status: 'na_cekanju'
  });

  const zZaFilip = await ScrimZahtjev.create({
    tim_posiljalac_id: svaTimovi[10].id, tim_primalac_id: timFilip.id,
    predlozeni_termin: danaUnazad(-1), broj_mapa: 1, pravila: 'Bo1 Warmup', status: 'na_cekanju'
  });

  // ============================================================
  // 5. MEČEVI (ODIGRANI + BUDUĆI KALENDAR)
  // ============================================================
  let ukupnoOdigranih = 0;
  let ukupnoZakazanih = 0;

  for (const igra of igre) {
    const timovi = timoviPoIgri.get(igra.id);
    for (let i = 0; i < timovi.length; i++) {
      for (let j = i + 1; j < timovi.length; j++) {
        const t1 = timovi[i];
        const t2 = timovi[j];

        // Odigrani meč (prošlost)
        const zOdigran = await ScrimZahtjev.create({
          tim_posiljalac_id: t1.id, tim_primalac_id: t2.id,
          predlozeni_termin: danaUnazad(nasumicniBroj(2, 25)), broj_mapa: 3, pravila: 'Standard', status: 'prihvacen'
        });
        const mecOdigran = await ScrimMec.create({
          zahtjev_id: zOdigran.id, tim1_id: t1.id, tim2_id: t2.id, zakazano_za: zOdigran.predlozeni_termin,
          status: 'odigran', ishod: 'tim1', pobjednik_tim_id: t1.id, rezultat: '2-1'
        });
        await upisiPrisustvaZaMec(mecOdigran.id, t1, clanoviMap.get(t1), t2, clanoviMap.get(t2), 'moze');
        ukupnoOdigranih++;

        // Zakazan meč (budućnost za kalendar)
        const zZakazan = await ScrimZahtjev.create({
          tim_posiljalac_id: t1.id, tim_primalac_id: t2.id,
          predlozeni_termin: danaUnazad(-nasumicniBroj(2, 14)), broj_mapa: 3, pravila: 'Bo3', status: 'prihvacen'
        });
        const mecZakazan = await ScrimMec.create({ zahtjev_id: zZakazan.id, tim1_id: t1.id, tim2_id: t2.id, zakazano_za: zZakazan.predlozeni_termin, status: 'zakazan' });
        await upisiPrisustvaZaMec(mecZakazan.id, t1, clanoviMap.get(t1), t2, clanoviMap.get(t2), 'na_cekanju');
        ukupnoZakazanih++;
      }
    }
  }

  // ============================================================
  // 6. TURNIRI (15 UKUPNO)
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
      max_timova: 8, format: 'single_elimination', status: tDef.status
    });
    const timoviIgre = timoviPoIgri.get(tDef.igra.id);
    if (timoviIgre.length >= 2) {
      await TurnirPrijava.bulkCreate([
        { turnir_id: turnir.id, tim_id: timoviIgre[0].id },
        { turnir_id: turnir.id, tim_id: timoviIgre[1].id }
      ]);
    }
  }

  // Direct chat između Ane i Marka
  const konvIzmedju = await Konverzacija.create({ tip: 'direktna' });
  await ClanKonverzacije.bulkCreate([
    { konverzacija_id: konvIzmedju.id, korisnik_id: ana.id, status: 'prihvacena' },
    { konverzacija_id: konvIzmedju.id, korisnik_id: marko.id, status: 'prihvacena' }
  ]);
  await Poruka.bulkCreate([
    { konverzacija_id: konvIzmedju.id, posiljalac_id: ana.id, tekst: 'Ćao Marko, poslao sam vam zahtjev za skrim meč u League of Legends.' },
    { konverzacija_id: konvIzmedju.id, posiljalac_id: marko.id, tekst: 'Odlično! Pregledaću sa ekipom pa prihvatam na sajtu.' }
  ]);

  console.log('\n======================================================================');
  console.log(' SEED USPJEŠNO ZAVRŠEN ZA DEMONSTRACIJU!');
  console.log('======================================================================');
  console.log(' 3 SPECIFIČNA TEST NALOGA (Lozinka za sve: lozinka123):');
  console.log(` 1. Filip Vujović  : ${filip.email}`);
  console.log(` 2. Ana Radulović   : ${ana.email} (Kapiten: Podgoričke Mange - LoL)`);
  console.log(` 3. Marko Backović  : ${marko.email} (Kapiten: Nikšićki Vukovi - LoL)`);
  console.log('======================================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Greška prilikom seed-ovanja:', err);
  process.exit(1);
});