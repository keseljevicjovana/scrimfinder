// Opcije za avatar — ISTI id-jevi moraju postojati i na frontendu (frontend/src/avatarOptions.js)
// jer frontend na osnovu ovih id-jeva iscrtava SVG.

const KOZA = ['koza1', 'koza2', 'koza3', 'koza4', 'koza5'];
const OCI = ['oci_plave', 'oci_zelene', 'oci_braon', 'oci_sive', 'oci_ljubicaste'];
const BOJA_KOSE = ['kosa_crna', 'kosa_braon', 'kosa_plava', 'kosa_riđa', 'kosa_neon_ljubicasta', 'kosa_neon_plava', 'kosa_sijeda'];
const FRIZURE_MUSKI = ['kratka', 'iroki', 'celav', 'kovrdzava', 'mohawk', 'dugacka_ravna'];
const FRIZURE_ZENSKI = ['dugacka_ravna', 'kovrdzava', 'kratki_bob', 'rep', 'pundza', 'mohawk'];
const ODJECA = ['odjeca_crna', 'odjeca_ljubicasta', 'odjeca_cyan', 'odjeca_pink', 'odjeca_zelena', 'odjeca_zuta'];
const DODATAK = ['nista', 'naocare', 'slusalice', 'vr_naocare', 'vizir'];

function nasumicno(niz) {
  return niz[Math.floor(Math.random() * niz.length)];
}

function generisiNasumicniAvatar(pol) {
  const frizure = pol === 'zenski' ? FRIZURE_ZENSKI : FRIZURE_MUSKI;
  return {
    koza: nasumicno(KOZA),
    oci: nasumicno(OCI),
    boja_kose: nasumicno(BOJA_KOSE),
    frizura: nasumicno(frizure),
    odjeca: nasumicno(ODJECA),
    dodatak: Math.random() < 0.35 ? nasumicno(DODATAK.filter((d) => d !== 'nista')) : 'nista',
  };
}

module.exports = {
  KOZA, OCI, BOJA_KOSE, FRIZURE_MUSKI, FRIZURE_ZENSKI, ODJECA, DODATAK, generisiNasumicniAvatar,
};
