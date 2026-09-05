const { PrisustvoMeca, ScrimMec, Dostignuce, KorisnikDostignuce } = require('../models');
const { posaljiNotifikaciju } = require('./notify');

// Provjerava i dodjeljuje dostignuća korisniku na osnovu PRISUSTVA mečevima (ne individualne
// statistike — ista je uklonjena). 'odigranih_meceva' = broj mečeva kojima je prisustvovao,
// 'pobjeda'/'win_rate' = uspjeh NJEGOVOG TIMA u tim mečevima (nagrađuje se za to što je bio tu).
async function provjeriDostignucaZaKorisnika(korisnik_id) {
  const svaDostignuca = await Dostignuce.findAll();
  const vecOsvojena = await KorisnikDostignuce.findAll({ where: { korisnik_id } });
  const osvojeniIds = new Set(vecOsvojena.map((d) => d.dostignuce_id));

  const prisustva = await PrisustvoMeca.findAll({
    where: { korisnik_id, status: 'moze' },
    include: [{ model: ScrimMec, where: { status: 'odigran' } }],
  });

  const odigranihMeceva = prisustva.length;
  const pobjeda = prisustva.filter((p) => {
    const m = p.ScrimMec;
    if (!m || !m.ishod || m.ishod === 'nerijeseno') return false;
    return (m.ishod === 'tim1' && m.tim1_id === p.tim_id) || (m.ishod === 'tim2' && m.tim2_id === p.tim_id);
  }).length;
  const winRate = odigranihMeceva > 0 ? Math.round((pobjeda / odigranihMeceva) * 100) : 0;

  for (const d of svaDostignuca) {
    if (osvojeniIds.has(d.id)) continue;
    let ispunjeno = false;
    if (d.uslov_tip === 'odigranih_meceva' && odigranihMeceva >= d.uslov_vrijednost) ispunjeno = true;
    if (d.uslov_tip === 'pobjeda' && pobjeda >= d.uslov_vrijednost) ispunjeno = true;
    if (d.uslov_tip === 'win_rate' && odigranihMeceva >= 5 && winRate >= d.uslov_vrijednost) ispunjeno = true;

    if (ispunjeno) {
      await KorisnikDostignuce.create({ korisnik_id, dostignuce_id: d.id });
      await posaljiNotifikaciju(korisnik_id, 'novo_dostignuce', `Osvojili ste dostignuće: ${d.naziv}`, 'igrac', korisnik_id);
    }
  }
}

module.exports = { provjeriDostignucaZaKorisnika };
