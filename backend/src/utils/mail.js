const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

async function posaljiJednokratnuLozinku(email, ime, jednokratnaLozinka) {
  const html = `
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
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'ScrimFinder — vaša jednokratna lozinka',
      html,
    });
  } catch (err) {
    // Ne prekidamo registraciju ako email ne uspije da se pošalje (npr. u razvoju bez podešenog SMTP-a),
    // ali obavezno logujemo grešku i, radi lakšeg testiranja, ispisujemo lozinku u konzolu.
    console.error('Slanje emaila nije uspjelo:', err.message);
    console.log(`[DEV] Jednokratna lozinka za ${email}: ${jednokratnaLozinka}`);
  }
}

module.exports = { posaljiJednokratnuLozinku };
