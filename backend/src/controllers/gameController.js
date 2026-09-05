const { Igra, Pozicija } = require('../models');

exports.listaIgara = async (req, res) => {
  const igre = await Igra.findAll({ include: [Pozicija] });
  res.json(igre);
};

exports.napraviIgru = async (req, res) => {
  const { naziv, ima_pozicije, pozicije } = req.body;
  const igra = await Igra.create({ naziv, ima_pozicije: !!ima_pozicije });
  if (Array.isArray(pozicije)) {
    await Promise.all(pozicije.map((p) => Pozicija.create({ igra_id: igra.id, naziv: p })));
  }
  const rezultat = await Igra.findByPk(igra.id, { include: [Pozicija] });
  res.status(201).json(rezultat);
};
