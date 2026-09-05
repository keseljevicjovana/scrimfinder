const { Notifikacija } = require('../models');

exports.mojeNotifikacije = async (req, res) => {
  const notifikacije = await Notifikacija.findAll({
    where: { korisnik_id: req.korisnik.id },
    order: [['created_at', 'DESC']],
    limit: 50,
  });
  res.json(notifikacije);
};

exports.oznaciProcitano = async (req, res) => {
  const notifikacija = await Notifikacija.findByPk(req.params.id);
  if (!notifikacija || notifikacija.korisnik_id !== req.korisnik.id) {
    return res.status(404).json({ poruka: 'Notifikacija nije pronađena.' });
  }
  await notifikacija.update({ procitano: true });
  res.json(notifikacija);
};

exports.oznaciSveProcitano = async (req, res) => {
  await Notifikacija.update({ procitano: true }, { where: { korisnik_id: req.korisnik.id, procitano: false } });
  res.json({ poruka: 'Sve notifikacije su označene kao pročitane.' });
};
