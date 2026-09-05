const nodemailer = require('nodemailer');

// Render (i mnogi drugi besplatni hosting servisi) BLOKIRAJU odlazne SMTP konekcije
// (port 587/465) da bi spriječili zloupotrebu za spam — zato SMTP često javlja
// "Connection timeout" na hostingu, iako identična podešavanja rade lokalno.
// Rješenje: šaljemo mejl preko HTTP API-ja nekog servisa (HTTPS, port 443, nikad blokiran).
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
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: posiljalac,
      to: [{ email, name: ime }],
      subject: 'ScrimFinder — vaša jednokratna lozinka',
      htmlContent: napraviHtml(ime, jednokratnaLozinka),
    }),
  });
  if (!res.ok) {
    const tekstGreske = await res.text();
    throw new Error(`Brevo API greška (${res.status}): ${tekstGreske}`);
  }
}

async function posaljiPrekoResendApi(email, ime, jednokratnaLozinka) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM || 'ScrimFinder <onboarding@resend.dev>',
      to: [email],
      subject: 'ScrimFinder — vaša jednokratna lozinka',
      html: napraviHtml(ime, jednokratnaLozinka),
    }),
  });
  if (!res.ok) {
    const tekstGreske = await res.text();
    throw new Error(`Resend API greška (${res.status}): ${tekstGreske}`);
  }
}

async function posaljiJednokratnuLozinku(email, ime, jednokratnaLozinka) {
  try {
    if (koristiBrevoApi) {
      await posaljiPrekoBrevoApi(email, ime, jednokratnaLozinka);
    } else if (koristiResendApi) {
      await posaljiPrekoResendApi(email, ime, jednokratnaLozinka);
    } else {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'ScrimFinder — vaša jednokratna lozinka',
        html: napraviHtml(ime, jednokratnaLozinka),
      });
    }
  } catch (err) {
    // Ne prekidamo registraciju ako email ne uspije da se pošalje, ali obavezno logujemo
    // grešku i, radi lakšeg testiranja, ispisujemo lozinku u konzolu.
    console.error('Slanje emaila nije uspjelo:', err.message);
    console.log(`[DEV] Jednokratna lozinka za ${email}: ${jednokratnaLozinka}`);
  }
}

module.exports = { posaljiJednokratnuLozinku };
