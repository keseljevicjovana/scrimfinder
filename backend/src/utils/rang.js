// Izračunava poene, trenutni niz pobjeda i rank tima na osnovu ODIGRANIH mečeva.
// Namjerno se NE čuva u bazi kao stanje — uvijek se računa iznova iz istorije mečeva,
// isto kao što se i prosječan rank tima ranije računao dinamički (vidi napomene u schema.sql).

const PRAGOVI = [
  { rank: 'Bronze', min: 0 },
  { rank: 'Silver', min: 10 },
  { rank: 'Gold', min: 24 },
  { rank: 'Platinum', min: 45 },
  { rank: 'Diamond', min: 72 },
  { rank: 'Pro', min: 105 },
];

function rankZaPoene(poeni) {
  let r = 'Bronze';
  for (const p of PRAGOVI) {
    if (poeni >= p.min) r = p.rank;
  }
  return r;
}

function sledeciPrag(poeni) {
  for (const p of PRAGOVI) {
    if (poeni < p.min) return p;
  }
  return null; // već je na maksimalnom (Pro)
}

// bonus za niz pobjeda: na 3, 5, 7, i svake dodatne 2 poslije toga
function streakBonus(niz) {
  if (niz === 3) return 2;
  if (niz === 5) return 5;
  if (niz === 7) return 10;
  if (niz > 7 && (niz - 7) % 2 === 0) return 10;
  return 0;
}

// mecevi: niz objekata { zakazano_za, ishod: 'tim1'|'tim2'|'nerijeseno', tim1_id, tim2_id } — SAMO odigrani.
function izracunajTimskuStatistiku(mecevi, timId) {
  const sortirani = [...mecevi].sort((a, b) => new Date(a.zakazano_za) - new Date(b.zakazano_za));
  let poeni = 0;
  let niz = 0;
  let pobjeda = 0;
  let poraza = 0;
  let nerijesenih = 0;
  const istorijaPoena = [];

  for (const m of sortirani) {
    if (m.ishod === 'nerijeseno') {
      poeni += 1;
      nerijesenih += 1;
      // nerešeno ne kida niz pobjeda, ali ga ni ne uvećava
    } else {
      const pobijedio = (m.ishod === 'tim1' && m.tim1_id === timId) || (m.ishod === 'tim2' && m.tim2_id === timId);
      if (pobijedio) {
        poeni += 3;
        niz += 1;
        poeni += streakBonus(niz);
        pobjeda += 1;
      } else {
        niz = 0;
        poraza += 1;
      }
    }
    istorijaPoena.push({ datum: m.zakazano_za, poeni });
  }

  const odigranihMeceva = sortirani.length;
  const winRate = odigranihMeceva > 0 ? Math.round((pobjeda / odigranihMeceva) * 100) : 0;
  const rank = rankZaPoene(poeni);
  const prag = sledeciPrag(poeni);

  return {
    poeni, trenutniNiz: niz, rank, odigranihMeceva, pobjeda, poraza, nerijesenih, winRate,
    istorijaPoena,
    sledeciRank: prag ? prag.rank : null,
    poenaDoSledecegRanga: prag ? prag.min - poeni : 0,
  };
}

module.exports = { rankZaPoene, izracunajTimskuStatistiku, PRAGOVI };
