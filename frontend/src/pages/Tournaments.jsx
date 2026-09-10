import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PRIORITET_STATUSA = { u_toku: 0, prijave_otvorene: 1, zavrsen: 2 };
const NAZIV_STATUSA = { u_toku: 'U toku', prijave_otvorene: 'Prijave otvorene', zavrsen: 'Završen' };

export default function Tournaments() {
  const { korisnik } = useAuth();
  const [turniri, setTurniri] = useState([]);
  const [mojiTimoviIds, setMojiTimoviIds] = useState(new Set());

  useEffect(() => { api.get('/turniri').then((res) => setTurniri(res.data)); }, []);
  useEffect(() => {
    if (!korisnik) return;
    api.get('/timovi/moji/lista').then((res) => setMojiTimoviIds(new Set(res.data.map((t) => t.tim.id))));
  }, [korisnik]);

  // Redoslijed: prvo turniri U TOKU, pa PRIJAVE OTVORENE, pa na kraju ZAVRŠENI.
  const sortirani = [...turniri].sort((a, b) => PRIORITET_STATUSA[a.status] - PRIORITET_STATUSA[b.status]);

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>Turniri</h1>
      <div className="grid grid-3">
        {sortirani.map((t) => {
          // "Prijavljen" je LIČNO stanje (moj tim je među prijavljenima), ne stanje turnira samog
          // po sebi — prikazuje se SAMO dok su prijave još otvorene (poslije toga status vodi glavnu riječ).
          const mojTimJePrijavljen = t.status === 'prijave_otvorene' && t.TurnirPrijavas?.some((p) => mojiTimoviIds.has(p.tim_id));
          const prikazniStatus = mojTimJePrijavljen ? 'prijavljen' : t.status;
          return (
            <Link key={t.id} to={`/turnir/${t.id}`} className="card">
              <h3 style={{ marginBottom: 4 }}>{t.naziv}</h3>
              <p className="muted">{t.Igra?.naziv}</p>
              <p className="muted mono">{new Date(t.datum).toLocaleDateString('sr-RS')}</p>
              <span className={`status-pill turnir-status-${prikazniStatus}`}>
                {mojTimJePrijavljen ? 'Prijavljen' : NAZIV_STATUSA[t.status]}
              </span>
            </Link>
          );
        })}
      </div>
      {turniri.length === 0 && <p className="muted">Trenutno nema zakazanih turnira.</p>}
    </div>
  );
}