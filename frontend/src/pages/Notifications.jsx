import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// Mapira tip veze notifikacije na stvarnu rutu u aplikaciji — klik na notifikaciju
// vodi TAČNO tamo gdje treba da se reaguje (na meč, tim, konverzaciju...), ne samo da je
// "označi kao pročitano" kao ranije — to je razlog zašto notifikacije uopšte postoje.
function putanjaZaNotifikaciju(n) {
  if (!n.link_entitet_tip || !n.link_entitet_id) return null;
  switch (n.link_entitet_tip) {
    case 'tim': return `/tim/${n.link_entitet_id}`;
    case 'mec': return `/mec/${n.link_entitet_id}`;
    case 'scrim_zahtjev': return '/scrim-zahtjevi';
    case 'igrac': return `/igrac/${n.link_entitet_id}`;
    case 'konverzacija': return null; // otvara se preko chat widgeta, ne posebne stranice
    default: return null;
  }
}

const OPIS_TIPA = {
  pozivnica_u_tim: 'Poziv / aplikacija za tim',
  aplikacija_prihvacena: 'Aplikacija prihvaćena',
  aplikacija_odbijena: 'Aplikacija odbijena',
  scrim_zahtjev_primljen: 'Novi scrim zahtjev',
  scrim_zahtjev_prihvacen: 'Zahtjev prihvaćen',
  scrim_zahtjev_odbijen: 'Zahtjev odbijen',
  novo_dostignuce: 'Novo dostignuće',
  komentar_na_timu: 'Novi komentar',
  turnir_pocinje: 'Turnir',
  poruka_zahtjev: 'Zahtjev za poruku',
  prisustvo_pitanje: 'Potvrda prisustva',
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifikacije, setNotifikacije] = useState([]);

  const ucitaj = () => api.get('/notifikacije').then((res) => setNotifikacije(res.data));
  useEffect(() => { ucitaj(); }, []);

  const oznaci = async (id) => {
    await api.put(`/notifikacije/${id}/procitano`);
    ucitaj();
  };

  const oznaciSve = async () => {
    await api.put('/notifikacije/procitano/sve');
    ucitaj();
  };

  const klik = async (n) => {
    if (!n.procitano) await oznaci(n.id);
    const putanja = putanjaZaNotifikaciju(n);
    if (putanja) navigate(putanja);
  };

  return (
    <div className="container" style={{ marginTop: 30, maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Notifikacije</h1>
        <button className="btn btn-outline btn-sm" onClick={oznaciSve}>Označi sve kao pročitano</button>
      </div>
      <p className="muted" style={{ marginTop: -6 }}>
        Ovdje stižu obavještenja o svemu što traži tvoju pažnju — pozivnice, odgovori na zahtjeve,
        pitanja o prisustvu meču, nova dostignuća i poruke. Klikni na notifikaciju da odeš direktno tamo.
      </p>
      {notifikacije.length === 0 && <p className="muted">Nemate notifikacija.</p>}
      {notifikacije.map((n) => {
        const putanja = putanjaZaNotifikaciju(n);
        return (
          <div
            key={n.id} className="card"
            style={{ marginBottom: 8, opacity: n.procitano ? 0.6 : 1, cursor: putanja ? 'pointer' : 'default' }}
            onClick={() => klik(n)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <span className="muted mono" style={{ fontSize: 10, textTransform: 'uppercase' }}>{OPIS_TIPA[n.tip] || n.tip}</span>
                <p style={{ margin: '2px 0 0' }}>{n.poruka}</p>
              </div>
              {!n.procitano && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-pink)', flexShrink: 0, marginTop: 6 }} />}
            </div>
            <span className="muted mono" style={{ fontSize: 12 }}>{new Date(n.created_at).toLocaleString('sr-RS')}</span>
          </div>
        );
      })}
    </div>
  );
}
