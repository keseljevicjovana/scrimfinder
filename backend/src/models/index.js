const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const Korisnik = sequelize.define('Korisnik', {
  ime: { type: DataTypes.STRING(60), allowNull: false },
  email: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  lozinka_hash: { type: DataTypes.STRING(255), allowNull: false },
  pol: { type: DataTypes.ENUM('muski', 'zenski'), defaultValue: 'muski' },
  avatar: { type: DataTypes.JSON },
  mora_promijeniti_lozinku: { type: DataTypes.BOOLEAN, defaultValue: true },
  uloga: { type: DataTypes.ENUM('igrac', 'admin'), defaultValue: 'igrac' },
}, { tableName: 'korisnici', underscored: true });

const Igra = sequelize.define('Igra', {
  naziv: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  ima_pozicije: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'igre', underscored: true, timestamps: false });

const Pozicija = sequelize.define('Pozicija', {
  naziv: { type: DataTypes.STRING(30), allowNull: false },
}, { tableName: 'pozicije', underscored: true, timestamps: false });

const ProfilIgraca = sequelize.define('ProfilIgraca', {
  rank: { type: DataTypes.ENUM('Bronze','Silver','Gold','Platinum','Diamond','Pro'), defaultValue: 'Bronze' },
  bio: DataTypes.TEXT,
}, { tableName: 'profili_igraca', underscored: true, timestamps: false });

const Dostupnost = sequelize.define('Dostupnost', {
  dan_u_sedmici: { type: DataTypes.TINYINT, allowNull: false },
  vrijeme_od: { type: DataTypes.TIME, allowNull: false },
  vrijeme_do: { type: DataTypes.TIME, allowNull: false },
}, { tableName: 'dostupnost', underscored: true, timestamps: false });

const Tim = sequelize.define('Tim', {
  naziv: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  logo_url: DataTypes.STRING(255),
  grb: { type: DataTypes.JSON, allowNull: true }, // generisani grb (oblik/boje/simbol) — alternativa ručnom URL-u loga
  opis: DataTypes.TEXT,
  trazi_igrace: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'timovi', underscored: true, createdAt: 'created_at', updatedAt: false });

const ClanTima = sequelize.define('ClanTima', {
  datum_pridruzenja: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'clanovi_tima', underscored: true, timestamps: false });

const Pozivnica = sequelize.define('Pozivnica', {
  status: { type: DataTypes.ENUM('na_cekanju','prihvacena','odbijena'), defaultValue: 'na_cekanju' },
}, { tableName: 'pozivnice', underscored: true, createdAt: 'created_at', updatedAt: false });

const Aplikacija = sequelize.define('Aplikacija', {
  poruka: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('na_cekanju','prihvacena','odbijena'), defaultValue: 'na_cekanju' },
}, { tableName: 'aplikacije', underscored: true, createdAt: 'created_at', updatedAt: false });

const ScrimZahtjev = sequelize.define('ScrimZahtjev', {
  predlozeni_termin: { type: DataTypes.DATE, allowNull: false },
  broj_mapa: { type: DataTypes.TINYINT, defaultValue: 1 },
  pravila: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('na_cekanju','prihvacen','odbijen'), defaultValue: 'na_cekanju' },
}, { tableName: 'scrim_zahtjevi', underscored: true, createdAt: 'created_at', updatedAt: false });

const Turnir = sequelize.define('Turnir', {
  naziv: { type: DataTypes.STRING(100), allowNull: false },
  datum: { type: DataTypes.DATE, allowNull: false },
  max_timova: { type: DataTypes.INTEGER, allowNull: false },
  format: { type: DataTypes.ENUM('single_elimination','double_elimination'), defaultValue: 'single_elimination' },
  status: { type: DataTypes.ENUM('prijave_otvorene','u_toku','zavrsen'), defaultValue: 'prijave_otvorene' },
}, { tableName: 'turniri', underscored: true, createdAt: 'created_at', updatedAt: false });

const ScrimMec = sequelize.define('ScrimMec', {
  runda_broj: DataTypes.INTEGER,
  zakazano_za: { type: DataTypes.DATE, allowNull: false },
  ishod: { type: DataTypes.ENUM('tim1', 'tim2', 'nerijeseno'), allowNull: true },
  glas_tim1: { type: DataTypes.ENUM('pobjeda', 'poraz', 'nerijeseno'), allowNull: true },
  glas_tim2: { type: DataTypes.ENUM('pobjeda', 'poraz', 'nerijeseno'), allowNull: true },
  rezultat: DataTypes.STRING(20),
  status: { type: DataTypes.ENUM('zakazan', 'odigran', 'otkazan', 'sporno'), defaultValue: 'zakazan' },
}, { tableName: 'scrim_mecevi', underscored: true, createdAt: 'created_at', updatedAt: false });

const MecStatistika = sequelize.define('MecStatistika', {
  kills: { type: DataTypes.INTEGER, defaultValue: 0 },
  deaths: { type: DataTypes.INTEGER, defaultValue: 0 },
  assists: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'mec_statistike', underscored: true, timestamps: false });

// Prisustvo igrača zakazanom meču (zamjenjuje individualnu statistiku kao mjeru učešća).
const PrisustvoMeca = sequelize.define('PrisustvoMeca', {
  status: { type: DataTypes.ENUM('na_cekanju', 'moze', 'ne_moze'), defaultValue: 'na_cekanju' },
}, {
  tableName: 'prisustva_meca', underscored: true, createdAt: 'created_at', updatedAt: false,
  indexes: [{ unique: true, fields: ['mec_id', 'korisnik_id'], name: 'uq_prisustvo' }],
});

const TurnirPrijava = sequelize.define('TurnirPrijava', {}, {
  tableName: 'turnir_prijave', underscored: true, createdAt: 'created_at', updatedAt: false,
});

const RasporedTurnira = sequelize.define('RasporedTurnira', {
  runda_broj: { type: DataTypes.INTEGER, allowNull: false },
  pozicija_u_rundi: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'raspored_turnira', underscored: true, createdAt: 'created_at', updatedAt: false });

const Komentar = sequelize.define('Komentar', {
  entitet_tip: { type: DataTypes.ENUM('tim','mec'), allowNull: false },
  entitet_id: { type: DataTypes.INTEGER, allowNull: false },
  tekst: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'komentari', underscored: true, createdAt: 'created_at', updatedAt: false });

const KomentarLajk = sequelize.define('KomentarLajk', {}, {
  tableName: 'komentar_lajkovi', underscored: true, createdAt: 'created_at', updatedAt: false,
});

const Konverzacija = sequelize.define('Konverzacija', {
  tip: { type: DataTypes.ENUM('tim', 'direktna'), allowNull: false },
}, { tableName: 'konverzacije', underscored: true, createdAt: 'created_at', updatedAt: false });

const ClanKonverzacije = sequelize.define('ClanKonverzacije', {
  status: { type: DataTypes.ENUM('prihvacena', 'na_cekanju', 'odbijena'), defaultValue: 'prihvacena' },
  pinovano: { type: DataTypes.BOOLEAN, defaultValue: false },
  poslednje_procitano_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'clanovi_konverzacije', underscored: true, createdAt: 'created_at', updatedAt: false });

const Poruka = sequelize.define('Poruka', {
  tekst: { type: DataTypes.TEXT, allowNull: false },
}, { tableName: 'poruke', underscored: true, createdAt: 'created_at', updatedAt: false });

const PrijavaSadrzaja = sequelize.define('PrijavaSadrzaja', {
  entitet_tip: { type: DataTypes.ENUM('komentar','korisnik'), allowNull: false },
  entitet_id: { type: DataTypes.INTEGER, allowNull: false },
  razlog: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('na_cekanju', 'rijeseno', 'ignorisano'), defaultValue: 'na_cekanju' },
}, { tableName: 'prijave_sadrzaja', underscored: true, createdAt: 'created_at', updatedAt: false });

const Dostignuce = sequelize.define('Dostignuce', {
  naziv: { type: DataTypes.STRING(80), allowNull: false },
  opis: DataTypes.TEXT,
  uslov_tip: { type: DataTypes.ENUM('odigranih_meceva','pobjeda','win_rate','osvojen_turnir'), allowNull: false },
  uslov_vrijednost: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'dostignuca', underscored: true, createdAt: 'created_at', updatedAt: false });

const KorisnikDostignuce = sequelize.define('KorisnikDostignuce', {
  dodijeljeno_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'korisnik_dostignuca', underscored: true, timestamps: false });

const Notifikacija = sequelize.define('Notifikacija', {
  tip: {
    type: DataTypes.ENUM(
      'pozivnica_u_tim','aplikacija_prihvacena','aplikacija_odbijena',
      'scrim_zahtjev_primljen','scrim_zahtjev_prihvacen','scrim_zahtjev_odbijen',
      'novo_dostignuce','komentar_na_timu','turnir_pocinje','poruka_zahtjev','prisustvo_pitanje'
    ), allowNull: false,
  },
  poruka: { type: DataTypes.STRING(255), allowNull: false },
  link_entitet_tip: DataTypes.STRING(30),
  link_entitet_id: DataTypes.INTEGER,
  procitano: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifikacije', underscored: true, createdAt: 'created_at', updatedAt: false });

// ---------------- RELACIJE ----------------

// Igra <-> Pozicija
Igra.hasMany(Pozicija, { foreignKey: 'igra_id' });
Pozicija.belongsTo(Igra, { foreignKey: 'igra_id' });

// Korisnik <-> ProfilIgraca (1:1)
Korisnik.hasOne(ProfilIgraca, { foreignKey: 'korisnik_id' });
ProfilIgraca.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
ProfilIgraca.belongsTo(Igra, { foreignKey: 'igra_id' });
ProfilIgraca.belongsTo(Pozicija, { foreignKey: 'pozicija_id' });

// Dostupnost
Korisnik.hasMany(Dostupnost, { foreignKey: 'korisnik_id' });
Dostupnost.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

// Tim
Igra.hasMany(Tim, { foreignKey: 'igra_id' });
Tim.belongsTo(Igra, { foreignKey: 'igra_id' });
Korisnik.hasMany(Tim, { foreignKey: 'kapiten_id', as: 'timoviKapiten' });
Tim.belongsTo(Korisnik, { foreignKey: 'kapiten_id', as: 'kapiten' });

// Clanovi tima (M:N Korisnik <-> Tim, preko clan_tima)
Tim.hasMany(ClanTima, { foreignKey: 'tim_id', as: 'clanovi' });
ClanTima.belongsTo(Tim, { foreignKey: 'tim_id' });
Korisnik.hasMany(ClanTima, { foreignKey: 'korisnik_id' });
ClanTima.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
ClanTima.belongsTo(Pozicija, { foreignKey: 'pozicija_id' });

// Pozivnice
Tim.hasMany(Pozivnica, { foreignKey: 'tim_id' });
Pozivnica.belongsTo(Tim, { foreignKey: 'tim_id' });
Korisnik.hasMany(Pozivnica, { foreignKey: 'pozvani_korisnik_id', as: 'primljenePozivnice' });
Pozivnica.belongsTo(Korisnik, { foreignKey: 'pozvani_korisnik_id', as: 'pozvaniKorisnik' });
Pozivnica.belongsTo(Korisnik, { foreignKey: 'poslao_korisnik_id', as: 'posiljalac' });

// Aplikacije
Tim.hasMany(Aplikacija, { foreignKey: 'tim_id' });
Aplikacija.belongsTo(Tim, { foreignKey: 'tim_id' });
Korisnik.hasMany(Aplikacija, { foreignKey: 'korisnik_id' });
Aplikacija.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

// Scrim zahtjevi
Tim.hasMany(ScrimZahtjev, { foreignKey: 'tim_posiljalac_id', as: 'poslatiZahtjevi' });
Tim.hasMany(ScrimZahtjev, { foreignKey: 'tim_primalac_id', as: 'primljeniZahtjevi' });
ScrimZahtjev.belongsTo(Tim, { foreignKey: 'tim_posiljalac_id', as: 'posiljalac' });
ScrimZahtjev.belongsTo(Tim, { foreignKey: 'tim_primalac_id', as: 'primalac' });

// Turniri
Igra.hasMany(Turnir, { foreignKey: 'igra_id' });
Turnir.belongsTo(Igra, { foreignKey: 'igra_id' });

// Scrim mecevi
ScrimZahtjev.hasOne(ScrimMec, { foreignKey: 'zahtjev_id' });
ScrimMec.belongsTo(ScrimZahtjev, { foreignKey: 'zahtjev_id' });
Tim.hasMany(ScrimMec, { foreignKey: 'tim1_id', as: 'meceviKaoTim1' });
Tim.hasMany(ScrimMec, { foreignKey: 'tim2_id', as: 'meceviKaoTim2' });
ScrimMec.belongsTo(Tim, { foreignKey: 'tim1_id', as: 'tim1' });
ScrimMec.belongsTo(Tim, { foreignKey: 'tim2_id', as: 'tim2' });
ScrimMec.belongsTo(Tim, { foreignKey: 'pobjednik_tim_id', as: 'pobjednik' });
Turnir.hasMany(ScrimMec, { foreignKey: 'turnir_id' });
ScrimMec.belongsTo(Turnir, { foreignKey: 'turnir_id' });

// Prisustva mečevima
ScrimMec.hasMany(PrisustvoMeca, { foreignKey: 'mec_id', as: 'prisustva' });
PrisustvoMeca.belongsTo(ScrimMec, { foreignKey: 'mec_id' });
Korisnik.hasMany(PrisustvoMeca, { foreignKey: 'korisnik_id' });
PrisustvoMeca.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
PrisustvoMeca.belongsTo(Tim, { foreignKey: 'tim_id' });

// Statistike
ScrimMec.hasMany(MecStatistika, { foreignKey: 'mec_id', as: 'statistike' });
MecStatistika.belongsTo(ScrimMec, { foreignKey: 'mec_id' });
Korisnik.hasMany(MecStatistika, { foreignKey: 'korisnik_id' });
MecStatistika.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
MecStatistika.belongsTo(Tim, { foreignKey: 'tim_id' });

// Turnir prijave
Turnir.hasMany(TurnirPrijava, { foreignKey: 'turnir_id' });
TurnirPrijava.belongsTo(Turnir, { foreignKey: 'turnir_id' });
Tim.hasMany(TurnirPrijava, { foreignKey: 'tim_id' });
TurnirPrijava.belongsTo(Tim, { foreignKey: 'tim_id' });

// Raspored turnira (bracket)
Turnir.hasMany(RasporedTurnira, { foreignKey: 'turnir_id', as: 'bracket' });
RasporedTurnira.belongsTo(Turnir, { foreignKey: 'turnir_id' });
RasporedTurnira.belongsTo(Tim, { foreignKey: 'tim1_id', as: 'tim1' });
RasporedTurnira.belongsTo(Tim, { foreignKey: 'tim2_id', as: 'tim2' });
RasporedTurnira.belongsTo(ScrimMec, { foreignKey: 'mec_id' });
RasporedTurnira.belongsTo(RasporedTurnira, { foreignKey: 'sledeci_slot_id', as: 'sledeciSlot' });

// Komentari
Korisnik.hasMany(Komentar, { foreignKey: 'autor_id' });
Komentar.belongsTo(Korisnik, { foreignKey: 'autor_id', as: 'autor' });
Komentar.hasMany(KomentarLajk, { foreignKey: 'komentar_id', as: 'lajkovi' });
KomentarLajk.belongsTo(Komentar, { foreignKey: 'komentar_id' });
Korisnik.hasMany(KomentarLajk, { foreignKey: 'korisnik_id' });
KomentarLajk.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

// Prijave sadrzaja
Korisnik.hasMany(PrijavaSadrzaja, { foreignKey: 'prijavio_korisnik_id', as: 'poslatePrijave' });
PrijavaSadrzaja.belongsTo(Korisnik, { foreignKey: 'prijavio_korisnik_id', as: 'prijavio' });
PrijavaSadrzaja.belongsTo(Korisnik, { foreignKey: 'rijesio_admin_id', as: 'rijesioAdmin' });

// Dostignuca
Korisnik.belongsToMany(Dostignuce, { through: KorisnikDostignuce, foreignKey: 'korisnik_id' });
Dostignuce.belongsToMany(Korisnik, { through: KorisnikDostignuce, foreignKey: 'dostignuce_id' });
KorisnikDostignuce.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
KorisnikDostignuce.belongsTo(Dostignuce, { foreignKey: 'dostignuce_id' });

// Notifikacije
Korisnik.hasMany(Notifikacija, { foreignKey: 'korisnik_id' });
Notifikacija.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });

// Chat
Tim.hasOne(Konverzacija, { foreignKey: 'tim_id', as: 'konverzacija' });
Konverzacija.belongsTo(Tim, { foreignKey: 'tim_id' });
Konverzacija.hasMany(ClanKonverzacije, { foreignKey: 'konverzacija_id', as: 'clanovi' });
ClanKonverzacije.belongsTo(Konverzacija, { foreignKey: 'konverzacija_id' });
Korisnik.hasMany(ClanKonverzacije, { foreignKey: 'korisnik_id' });
ClanKonverzacije.belongsTo(Korisnik, { foreignKey: 'korisnik_id' });
Konverzacija.hasMany(Poruka, { foreignKey: 'konverzacija_id', as: 'poruke' });
Poruka.belongsTo(Konverzacija, { foreignKey: 'konverzacija_id' });
Korisnik.hasMany(Poruka, { foreignKey: 'posiljalac_id' });
Poruka.belongsTo(Korisnik, { foreignKey: 'posiljalac_id', as: 'posiljalac' });

module.exports = {
  sequelize, Korisnik, Igra, Pozicija, ProfilIgraca, Dostupnost, Tim, ClanTima,
  Pozivnica, Aplikacija, ScrimZahtjev, Turnir, ScrimMec, MecStatistika,
  TurnirPrijava, RasporedTurnira, Komentar, KomentarLajk, PrijavaSadrzaja,
  Dostignuce, KorisnikDostignuce, Notifikacija,
  Konverzacija, ClanKonverzacije, Poruka, PrisustvoMeca,
};
