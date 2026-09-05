require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
require('./models');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/korisnici', require('./routes/userRoutes'));
app.use('/api/igre', require('./routes/gameRoutes'));
app.use('/api/timovi', require('./routes/teamRoutes'));
app.use('/api/scrim', require('./routes/scrimRoutes'));
app.use('/api/komentari', require('./routes/commentRoutes'));
app.use('/api/notifikacije', require('./routes/notificationRoutes'));
app.use('/api/prijave', require('./routes/reportRoutes'));
app.use('/api/dostignuca', require('./routes/achievementRoutes'));
app.use('/api/turniri', require('./routes/tournamentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

app.get('/api/zdravlje', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ poruka: 'Ruta nije pronađena.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ poruka: 'Došlo je do greške na serveru.' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // za produkciju koristiti migracije umjesto sync()
    console.log('Konekcija sa bazom uspostavljena.');
    app.listen(PORT, () => console.log(`Server radi na http://localhost:${PORT}`));
  } catch (err) {
    console.error('Greška prilikom povezivanja na bazu:', err);
    process.exit(1);
  }
}

start();
