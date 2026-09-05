const { Op } = require('sequelize');
const { ScrimMec } = require('../models');

const BAFER_SATI = 2; // pretpostavljeno trajanje meča — koristi se SAMO interno za provjeru preklapanja, nikad se ne traži od korisnika

// Vraća meč koji se vremenski preklapa sa datim terminom za dati tim (ili null ako nema sudara).
// Gleda samo mečeve statusa 'zakazan' (buduće rezervisane termine) — odigrani/otkazani/sporni ne blokiraju nove termine.
async function nadjiPreklapanje(tim_id, noviTermin, iskljuciMecId = null) {
  const where = {
    status: 'zakazan',
    [Op.or]: [{ tim1_id: tim_id }, { tim2_id: tim_id }],
  };
  if (iskljuciMecId) where.id = { [Op.ne]: iskljuciMecId };

  const mecevi = await ScrimMec.findAll({ where });
  const novo = new Date(noviTermin).getTime();
  const baferMs = BAFER_SATI * 3600 * 1000;

  return mecevi.find((m) => Math.abs(new Date(m.zakazano_za).getTime() - novo) < baferMs) || null;
}

module.exports = { nadjiPreklapanje, BAFER_SATI };
