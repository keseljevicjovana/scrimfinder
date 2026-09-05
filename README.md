# ScrimFinder

Platforma za povezivanje kompetitivnih e-sport timova radi organizovanja skrim mečeva,
praćenja statistike i takmičenja na turnirima.

## Struktura projekta

```
scrimfinder/
├── database/
│   └── schema.sql          — kompletna MySQL šema (18 tabela) sa komentarima o ispravkama
├── backend/                — Node.js + Express + Sequelize API
│   └── src/
│       ├── config/         — konekcija na bazu
│       ├── models/         — Sequelize modeli i relacije (index.js)
│       ├── controllers/    — poslovna logika
│       ├── routes/         — Express rute
│       ├── middleware/     — JWT autentifikacija, provjera admin uloge
│       ├── utils/          — notifikacije, automatska provjera dostignuća
│       └── seed/seed.js    — test podaci (admin + 16 igrača, srpska imena)
└── frontend/                — React + Vite aplikacija
    └── src/
        ├── pages/           — stranice (profil, pretraga, turniri, admin panel...)
        ├── components/      — Navbar, komentari, rank bedž...
        ├── context/         — AuthContext (JWT, trenutni korisnik)
        └── api/axios.js     — HTTP klijent
```

## Pokretanje — backend

```bash
cd backend
npm install
cp .env.example .env       # upiši MySQL i SMTP podatke u .env
npm run seed                # kreira tabele i ubacuje test podatke
npm run dev                  # pokreće server na http://localhost:4000
```

### Podešavanje slanja emaila (jednokratna lozinka)

Registracija šalje jednokratnu lozinku na email preko SMTP-a (nodemailer). U `.env` upiši
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — npr. Gmail (uz "App Password"),
ili besplatan servis za testiranje kao Mailtrap/Brevo. **Ako SMTP nije podešen ili slanje ne uspije,
aplikacija se neće srušiti — jednokratna lozinka će samo biti ispisana u konzoli servera** (pogledaj
`backend/src/utils/mail.js`), što je zgodno za testiranje bez pravog email naloga.

## Pokretanje — frontend

```bash
cd frontend
npm install
npm run dev                  # pokreće aplikaciju na http://localhost:5173
```

## Test nalozi (nakon `npm run seed`)

Lozinka za sve naloge: **lozinka123**

| Uloga  | Email                     | Napomena                          |
|--------|----------------------------|------------------------------------|
| Admin  | admin@scrimfinder.rs       | pristup `/admin` panelu            |
| Kapiten| nikola@scrimfinder.rs      | kapiten tima "Crveni Zmajevi"      |
| Kapiten| luka@scrimfinder.rs        | kapiten tima "Balkan Legion"       |
| Igrač  | stefan@scrimfinder.rs      | član tima "Crveni Zmajevi"         |
| ...    | (još 12 test igrača)       | svi sa istom lozinkom              |

## Tok registracije i prijave (jednokratna lozinka)

1. Korisnik se registruje sa imenom, emailom i polom (pol određuje koji skup podrazumijevanih
   frizura se koristi za nasumično generisan avatar).
2. Sistem generiše nasumičnu jednokratnu lozinku (8 karaktera), hešuje je i šalje je na email.
3. Korisnik se prijavljuje tom lozinkom.
4. Pošto je `mora_promijeniti_lozinku = true`, aplikacija ga odmah preusmjerava na **Moj profil**
   i ne dozvoljava mu pristup ostatku sajta dok ne postavi trajnu lozinku (unosom jednokratne
   lozinke + nove lozinke dva puta, na `PUT /api/korisnici/lozinka`).
5. Nakon toga se `mora_promijeniti_lozinku` postavlja na `false` i korisnik dalje slobodno
   koristi platformu, uključujući izmjenu lozinke kad god poželi sa iste stranice.

## Avatar sistem

- Pri registraciji se, na osnovu pola, nasumično bira: boja kože, boja očiju, boja kose, frizura
  (odvojene liste za muški/ženski), odjeća i (rijetko) dodatak — logika u
  `backend/src/utils/avatarOptions.js`.
- Avatar se čuva kao JSON kolona (`korisnici.avatar`) — nema potrebe za upload-om slika.
- Korisnik ga uređuje na stranici **Moj profil** (`AvatarEditor` komponenta) uz prikaz uživo.
- Avatar se iscrtava kao lagani SVG (`frontend/src/avatar/AvatarSvg.jsx`), bez spoljnih slika —
  laka za proširiti novim frizurama/dodacima izmjenom `avatarOptions.js` na oba mjesta
  (frontend i backend moraju imati iste id-jeve).

## Napomene za odbranu projekta

- Baza je namjerno redizajnirana u odnosu na prvobitni koncept — vidi komentare
  u `database/schema.sql` uz svaku tabelu (označeno sa "ISPRAVKA #broj") koji objašnjavaju
  koji je problem riješen i zašto.
- `sequelize.sync()` u `server.js` je korišćen radi jednostavnosti razvoja;
  za produkciju bi trebalo koristi Sequelize migracije.
- Bracket generator (`tournamentController.js` → `generisiBracket`) implementira
  single-elimination sistem sa automatskim "bye" prolaskom kada broj timova
  nije stepen dvojke, i automatskim guranjem pobjednika u sledeću rundu.
- Sistem dostignuća (`utils/achievements.js`) se automatski poziva nakon
  unosa rezultata meča i provjerava mašinski čitljive uslove (odigranih_meceva,
  pobjeda, win_rate, osvojen_turnir).
- Ne zaboravi da za odbranu izvezeš i priložiš PDF razgovora sa AI alatima
  korišćenim tokom izrade (traženo u konceptu polaganja).
