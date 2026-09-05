// Opcije za izgled avatara. Id-jevi moraju odgovarati backend/src/utils/avatarOptions.js

export const KOZA = [
  { id: 'koza1', hex: '#ffdbac', naziv: 'Svijetla' },
  { id: 'koza2', hex: '#f1c27d', naziv: 'Bež' },
  { id: 'koza3', hex: '#e0ac69', naziv: 'Maslinasta' },
  { id: 'koza4', hex: '#c68642', naziv: 'Tamnija' },
  { id: 'koza5', hex: '#8d5524', naziv: 'Tamna' },
];

export const OCI = [
  { id: 'oci_plave', hex: '#4aa8ff', naziv: 'Plave' },
  { id: 'oci_zelene', hex: '#4aff8f', naziv: 'Zelene' },
  { id: 'oci_braon', hex: '#8b5a2b', naziv: 'Braon' },
  { id: 'oci_sive', hex: '#a0a0b0', naziv: 'Sive' },
  { id: 'oci_ljubicaste', hex: '#c46bff', naziv: 'Ljubičaste (neon)' },
];

export const BOJA_KOSE = [
  { id: 'kosa_crna', hex: '#1a1a1a', naziv: 'Crna' },
  { id: 'kosa_braon', hex: '#5a3825', naziv: 'Braon' },
  { id: 'kosa_plava', hex: '#d4a537', naziv: 'Plava (svijetla)' },
  { id: 'kosa_riđa', hex: '#b5541e', naziv: 'Riđa' },
  { id: 'kosa_neon_ljubicasta', hex: '#b23bff', naziv: 'Neon ljubičasta' },
  { id: 'kosa_neon_plava', hex: '#00f0ff', naziv: 'Neon cyan' },
  { id: 'kosa_sijeda', hex: '#dcdcdc', naziv: 'Sijeda' },
];

export const FRIZURE = {
  muski: [
    { id: 'kratka', naziv: 'Kratka' },
    { id: 'iroki', naziv: 'Iroki' },
    { id: 'celav', naziv: 'Ćelav' },
    { id: 'kovrdzava', naziv: 'Kovrdžava' },
    { id: 'mohawk', naziv: 'Mohawk' },
    { id: 'dugacka_ravna', naziv: 'Dugačka' },
  ],
  zenski: [
    { id: 'dugacka_ravna', naziv: 'Duga ravna' },
    { id: 'kovrdzava', naziv: 'Kovrdžava' },
    { id: 'kratki_bob', naziv: 'Bob frizura' },
    { id: 'rep', naziv: 'Rep (ponytail)' },
    { id: 'pundza', naziv: 'Punđa' },
    { id: 'mohawk', naziv: 'Mohawk' },
  ],
};

export const ODJECA = [
  { id: 'odjeca_crna', hex: '#1c1c26', naziv: 'Crna gejmerska jakna' },
  { id: 'odjeca_ljubicasta', hex: '#7b2ff7', naziv: 'Ljubičasti hoodie' },
  { id: 'odjeca_cyan', hex: '#00b8c4', naziv: 'Cyan trenerka' },
  { id: 'odjeca_pink', hex: '#e6299b', naziv: 'Pink jakna' },
  { id: 'odjeca_zelena', hex: '#2f9e58', naziv: 'Zelena majica' },
  { id: 'odjeca_zuta', hex: '#e0b400', naziv: 'Žuta majica' },
];

export const DODATAK = [
  { id: 'nista', naziv: 'Bez dodatka' },
  { id: 'naocare', naziv: 'Naočare' },
  { id: 'slusalice', naziv: 'Gejmerske slušalice' },
  { id: 'vr_naocare', naziv: 'VR naočare' },
  { id: 'vizir', naziv: 'HUD vizir' },
];

export function nadjiHex(lista, id) {
  const stavka = lista.find((x) => x.id === id);
  return stavka ? stavka.hex : '#888888';
}

export function nasumicno(niz) {
  return niz[Math.floor(Math.random() * niz.length)];
}

export function generisiNasumicniAvatar(pol) {
  const frizure = pol === 'zenski' ? FRIZURE.zenski : FRIZURE.muski;
  return {
    koza: nasumicno(KOZA).id,
    oci: nasumicno(OCI).id,
    boja_kose: nasumicno(BOJA_KOSE).id,
    frizura: nasumicno(frizure).id,
    odjeca: nasumicno(ODJECA).id,
    dodatak: 'nista',
  };
}
