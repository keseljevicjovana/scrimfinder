const { Sequelize } = require('sequelize');
require('dotenv').config();

// TiDB Cloud (i većina hosted MySQL servisa) zahtijeva SSL konekciju — lokalno (XAMPP/Workbench)
// to nije potrebno, pa se aktivira samo kad je DB_SSL=true u .env (postavlja se na hostingu).
const koristiSSL = process.env.DB_SSL === 'true';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'scrimfinder',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: koristiSSL
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : {},
  }
);

module.exports = sequelize;
