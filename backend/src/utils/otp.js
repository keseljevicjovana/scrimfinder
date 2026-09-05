const SLOVA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // bez lako zabunjivih znakova (0/O, 1/I/l)

function generisiJednokratnuLozinku(duzina = 8) {
  let rezultat = '';
  for (let i = 0; i < duzina; i++) {
    rezultat += SLOVA[Math.floor(Math.random() * SLOVA.length)];
  }
  return rezultat;
}

module.exports = { generisiJednokratnuLozinku };
