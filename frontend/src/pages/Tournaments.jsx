import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Tournaments() {
  const [turniri, setTurniri] = useState([]);
  useEffect(() => { api.get('/turniri').then((res) => setTurniri(res.data)); }, []);

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>Turniri</h1>
      <div className="grid grid-3">
        {turniri.map((t) => (
          <Link key={t.id} to={`/turnir/${t.id}`} className="card">
            <h3 style={{ marginBottom: 4 }}>{t.naziv}</h3>
            <p className="muted">{t.Igra?.naziv}</p>
            <p className="muted mono">{new Date(t.datum).toLocaleDateString('sr-RS')}</p>
            <span className={`status-pill status-${t.status === 'zavrsen' ? 'odigran' : t.status === 'u_toku' ? 'prihvacen' : 'na_cekanju'}`}>
              {t.status.replace('_', ' ')}
            </span>
          </Link>
        ))}
      </div>
      {turniri.length === 0 && <p className="muted">Trenutno nema zakazanih turnira.</p>}
    </div>
  );
}
