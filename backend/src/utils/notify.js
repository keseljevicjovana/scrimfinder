const { Notifikacija } = require('../models');

async function posaljiNotifikaciju(korisnik_id, tip, poruka, link_entitet_tip = null, link_entitet_id = null) {
  return Notifikacija.create({ korisnik_id, tip, poruka, link_entitet_tip, link_entitet_id });
}

module.exports = { posaljiNotifikaciju };
