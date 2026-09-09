const https = require('https');
const nodemailer = require('nodemailer');

// Render (i mnogi drugi besplatni hosting servisi) BLOKIRAJU odlazne SMTP konekcije
// (port 587/465) da bi spriječili zloupotrebu za spam — zato SMTP često javlja
// "Connection timeout" na hostingu, iako identična podešavanja rade lokalno.
// Rješenje: šaljemo mejl preko HTTP API-ja nekog servisa (HTTPS, port 443, nikad blokiran).
//
// VAŽNO: koristimo Node-ov UGRAĐENI 'https' modul (radi na SVAKOJ verziji Node-a), umjesto
// globalne 'fetch' funkcije — 'fetch' postoji tek od Node 18 nadalje, i ako hosting koristi
// stariju verziju, 'fetch' bi bio nedefinisan i slanje bi tiho propadalo bez jasnog razloga.
//
// Podržana dva provajdera, biraju se automatski prema tome koji je API ključ podešen:
//  - BREVO_API_KEY  -> Brevo (300 mejlova/dan besplatno, šalje na BILO KOG primaoca,
//                       samo pošiljalac mora biti verifikovan kao "Sender" u Brevo nalogu)
//  - RESEND_API_KEY -> Resend (bez verifikacije domena šalje SAMO na email vlasnika naloga —
//                       dobro za brzo testiranje, ali ne i za prave korisnike)
// Ako nijedan API ključ nije podešen, koristi se "stari" SMTP put (dobar za lokalni razvoj).

const koristiBrevoApi = !!process.env.BREVO_API_KEY;
const koristiResendApi = !koristiBrevoApi && !!process.env.RESEND_API_KEY;

const transporter = (koristiBrevoApi || koristiResendApi) ? null : nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

// Generički POST zahtjev preko Node-ovog ugrađenog 'https' modula — vraća Promise,
// baca grešku ako status kod nije 2xx (isto ponašanje kao provjera 'res.ok' kod fetch-a).
function httpsPostJson(url, headers, tijelo) {
  return new Promise((resolve, reject) => {
    const podaci = JSON.stringify(tijelo);
    const opcije = {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(podaci) },
    };
    const req = https.request(url, opcije, (res) => {
      let telo = '';
      res.on('data', (chunk) => { telo += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(telo);
        else reject(new Error(`HTTP ${res.statusCode}: ${telo}`));
      });
    });
    req.on('error', reject);
    req.write(podaci);
    req.end();
  });
}

function napraviHtml(ime, jednokratnaLozinka) {
  return `
    <div style="font-family: Arial, sans-serif; background:#120a1f; color:#f1eaff; padding:24px;">
      <h2 style="color:#00f0ff;">Dobrodošli na ScrimFinder, ${ime}!</h2>
      <p>Vaš nalog je kreiran. Za prvu prijavu koristite jednokratnu lozinku ispod:</p>
      <p style="font-size:22px; letter-spacing:3px; font-family: monospace; background:#201336; padding:12px 18px; display:inline-block; border-radius:4px; color:#ffe14d;">
        ${jednokratnaLozinka}
      </p>
      <p>Nakon prijave bićete automatski preusmjereni na stranicu <strong>Moj profil</strong> gdje morate
      postaviti trajnu lozinku (unosom ove jednokratne lozinke i nove lozinke dva puta).</p>
      <p style="color:#a693c9; font-size:12px; margin-top:24px;">Ako niste vi kreirali ovaj nalog, slobodno ignorišite ovaj email.</p>
    </div>
  `;
}

// Iz "ScrimFinder <ime@domen.com>" izvlači { name, email } — Brevo API traži odvojena polja,
// za razliku od Resend-a i običnog SMTP-a koji prihvataju jedan spojen string.
function rastaviPosiljaoca() {
  const sirovo = process.env.SMTP_FROM || process.env.SMTP_USER || 'ScrimFinder <onboarding@resend.dev>';
  const poklapanje = sirovo.match(/^(.*)<(.+)>$/);
  if (poklapanje) return { name: poklapanje[1].trim() || 'ScrimFinder', email: poklapanje[2].trim() };
  return { name: 'ScrimFinder', email: sirovo.trim() };
}

async function posaljiPrekoBrevoApi(email, ime, jednokratnaLozinka) {
  const posiljalac = rastaviPosiljaoca();
  await httpsPostJson(
    'https://api.brevo.com/v3/smtp/email',
    { 'api-key': process.env.BREVO_API_KEY, Accept: 'application/json' },
    {
      sender: posiljalac,
      to: [{ email, name: ime }],
      subject: 'ScrimFinder — vaša jednokratna lozinka',
      htmlContent: napraviHtml(ime, jednokratnaLozinka),
    },
  );
}

async function posaljiPrekoResendApi(email, ime, jednokratnaLozinka) {
  await httpsPostJson(
    'https://api.resend.com/emails',
    { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    {
      from: process.env.SMTP_FROM || 'ScrimFinder <onboarding@resend.dev>',
      to: [email],
      subject: 'ScrimFinder — vaša jednokratna lozinka',
      html: napraviHtml(ime, jednokratnaLozinka),
    },
  );
}

async function posaljiJednokratnuLozinku(email, ime, jednokratnaLozinka) {
  try {
    if (koristiBrevoApi) {
      await posaljiPrekoBrevoApi(email, ime, jednokratnaLozinka);
      console.log(`Email uspješno poslat preko Brevo API-ja na ${email}.`);
    } else if (koristiResendApi) {
      await posaljiPrekoResendApi(email, ime, jednokratnaLozinka);
      console.log(`Email uspješno poslat preko Resend API-ja na ${email}.`);
    } else {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'ScrimFinder — vaša jednokratna lozinka',
        html: napraviHtml(ime, jednokratnaLozinka),
      });
      console.log(`Email uspješno poslat preko SMTP-a na ${email}.`);
    }
  } catch (err) {
    // Ne prekidamo registraciju ako email ne uspije da se pošalje, ali obavezno logujemo
    // grešku i, radi lakšeg testiranja, ispisujemo lozinku u konzolu.
    console.error('Slanje emaila nije uspjelo:', err.message);
    console.log(`[DEV] Jednokratna lozinka za ${email}: ${jednokratnaLozinka}`);
  }
}

module.exports = { posaljiJednokratnuLozinku };