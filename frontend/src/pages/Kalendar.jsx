import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const DANI_KRATKI = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
const MJESECI = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

function kljucDana(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

const STATUS_BOJA = { zakazan: 'var(--neon-cyan)', odigran: 'var(--neon-green)', otkazan: 'var(--text-muted)', sporno: 'var(--danger)' };

export default function Kalendar() {
  const [mecevi, setMecevi] = useState(null);
  const [prikaz, setPrikaz] = useState(() => { const d = new Date(); return { godina: d.getFullYear(), mjesec: d.getMonth() }; });
  const [izabranDan, setIzabranDan] = useState(null);

  useEffect(() => {
    api.get('/scrim/kalendar/moj').then((res) => setMecevi(res.data));
  }, []);

  if (mecevi === null) return <div className="container" style={{ marginTop: 30 }}><p className="muted">Učitavanje...</p></div>;

  const poDanu = {};
  mecevi.forEach((m) => {
    const k = kljucDana(m.zakazano_za);
    poDanu[k] = poDanu[k] || [];
    poDanu[k].push(m);
  });

  const { godina, mjesec } = prikaz;
  const prviDan = new Date(godina, mjesec, 1);
  const brojDana = new Date(godina, mjesec + 1, 0).getDate();
  const pomjeraj = (prviDan.getDay() + 6) % 7; // ponedjeljak = 0

  const celije = [];
  for (let i = 0; i < pomjeraj; i++) celije.push(null);
  for (let dan = 1; dan <= brojDana; dan++) celije.push(dan);

  const danas = new Date();
  const jeIsti = (dan) => dan === danas.getDate() && mjesec === danas.getMonth() && godina === danas.getFullYear();

  const promjeniMjesec = (delta) => {
    let noviMjesec = mjesec + delta;
    let novaGodina = godina;
    if (noviMjesec < 0) { noviMjesec = 11; novaGodina -= 1; }
    if (noviMjesec > 11) { noviMjesec = 0; novaGodina += 1; }
    setPrikaz({ godina: novaGodina, mjesec: noviMjesec });
    setIzabranDan(null);
  };

  const mecoviIzabranogDana = izabranDan ? (poDanu[`${godina}-${mjesec}-${izabranDan}`] || []) : [];

  return (
    <div className="container fade-in" style={{ marginTop: 30, marginBottom: 40 }}>
      <h1>Kalendar</h1>
      <p className="muted">Svi zakazani i odigrani mečevi tvojih timova. Klikni na dan da vidiš detalje.</p>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button className="btn btn-sm btn-outline" onClick={() => promjeniMjesec(-1)}>← Prethodni</button>
          <h2 style={{ margin: 0 }}>{MJESECI[mjesec]} {godina}</h2>
          <button className="btn btn-sm btn-outline" onClick={() => promjeniMjesec(1)}>Sledeći →</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
          {DANI_KRATKI.map((d) => (
            <div key={d} className="muted mono" style={{ textAlign: 'center', fontSize: 11, textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {celije.map((dan, idx) => {
            if (dan === null) return <div key={`prazno-${idx}`} />;
            const mecoviTogDana = poDanu[`${godina}-${mjesec}-${dan}`] || [];
            const imaMeceva = mecoviTogDana.length > 0;
            return (
              <div
                key={dan}
                onClick={() => imaMeceva && setIzabranDan(dan)}
                style={{
                  aspectRatio: '1', borderRadius: 8, padding: 6,
                  background: izabranDan === dan ? 'rgba(0,240,255,0.15)' : 'var(--bg-elevated)',
                  border: jeIsti(dan) ? '2px solid var(--neon-yellow)' : '1px solid var(--border)',
                  cursor: imaMeceva ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                  transition: 'transform 0.1s', position: 'relative',
                }}
              >
                <span className="mono" style={{ fontSize: 12, color: jeIsti(dan) ? 'var(--neon-yellow)' : 'var(--text)' }}>{dan}</span>
                {imaMeceva && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {mecoviTogDana.slice(0, 4).map((m) => (
                      <div key={m.id} style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_BOJA[m.status] || 'var(--text-muted)' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {izabranDan && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{izabranDan}. {MJESECI[mjesec]} {godina}.</h3>
            <button onClick={() => setIzabranDan(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          {mecoviIzabranogDana.length === 0 && <p className="muted">Nema mečeva ovog dana.</p>}
          {mecoviIzabranogDana.map((m) => (
            <Link key={m.id} to={`/mec/${m.id}`} className="kalendar-stavka" style={{ color: 'inherit' }}>
              <span className="vrijeme">{new Date(m.zakazano_za).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}</span>
              <div style={{ flex: 1 }}>
                <strong>{m.tim1?.naziv}</strong> <span className="muted">vs</span> <strong>{m.tim2?.naziv}</strong>
              </div>
              <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', color: STATUS_BOJA[m.status] || 'var(--text-muted)' }}>{m.status}</span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_BOJA).map(([status, boja]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} className="muted">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: boja }} /> {status}
          </div>
        ))}
      </div>
    </div>
  );
}
