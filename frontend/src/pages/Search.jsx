import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RankBadge from '../components/RankBadge';

const DANI = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

export default function Search() {
  const [rezim, setRezim] = useState('brza');
  const [igre, setIgre] = useState([]);
  const [q, setQ] = useState('');
  const [brziRezultati, setBrziRezultati] = useState(null);
  const [filteri, setFilteri] = useState({ igra_id: '', rank_min: '', rank_max: '', min_clanova: '', trazi_igrace: '', dan: '', vrijeme: '' });
  const [timovi, setTimovi] = useState([]);
  const [ucitava, setUcitava] = useState(false);

  useEffect(() => { api.get('/igre').then((res) => setIgre(res.data)); }, []);

  // Uživo pretraga — čim korisnik ukuca (uz malu pauzu od 300ms da ne šaljemo zahtjev na svaki taster).
  useEffect(() => {
    if (!q.trim()) { setBrziRezultati(null); return; }
    const t = setTimeout(() => {
      api.get(`/timovi/pretraga/brza?q=${encodeURIComponent(q)}`).then((res) => setBrziRezultati(res.data));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const pretraziDetaljno = async (e) => {
    e.preventDefault();
    setUcitava(true);
    const params = new URLSearchParams(Object.entries(filteri).filter(([, v]) => v !== ''));
    const res = await api.get(`/timovi/pretraga/detaljna?${params.toString()}`);
    setTimovi(res.data);
    setUcitava(false);
  };

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>Pretraga</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={`btn ${rezim === 'brza' ? '' : 'btn-outline'}`} onClick={() => setRezim('brza')}>Brza pretraga</button>
        <button className={`btn ${rezim === 'detaljna' ? '' : 'btn-outline'}`} onClick={() => setRezim('detaljna')}>Detaljna pretraga</button>
      </div>

      {rezim === 'brza' && (
        <div>
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input placeholder="Ukucaj naziv tima ili igrača — rezultati se prikazuju odmah..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </form>
          {brziRezultati && (
            <div className="grid grid-2">
              <div>
                <h3>Timovi</h3>
                {brziRezultati.timovi.length === 0 && <p className="muted">Nema rezultata.</p>}
                {brziRezultati.timovi.map((t) => (
                  <Link key={t.id} to={`/tim/${t.id}`} className="card" style={{ display: 'block', marginBottom: 10 }}>
                    <strong>{t.naziv}</strong> <span className="muted">— {t.Igra?.naziv}</span>
                  </Link>
                ))}
              </div>
              <div>
                <h3>Igrači</h3>
                {brziRezultati.igraci.length === 0 && <p className="muted">Nema rezultata.</p>}
                {brziRezultati.igraci.map((i) => (
                  <Link key={i.id} to={`/igrac/${i.id}`} className="card" style={{ display: 'block', marginBottom: 10 }}>
                    <strong>{i.ime}</strong>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {rezim === 'detaljna' && (
        <div>
          <form onSubmit={pretraziDetaljno} className="card grid grid-3" style={{ marginBottom: 20 }}>
            <div className="field">
              <label>Igra</label>
              <select value={filteri.igra_id} onChange={(e) => setFilteri({ ...filteri, igra_id: e.target.value })}>
                <option value="">Sve igre</option>
                {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Min. rank</label>
              <select value={filteri.rank_min} onChange={(e) => setFilteri({ ...filteri, rank_min: e.target.value })}>
                <option value="">—</option>
                {['Bronze','Silver','Gold','Platinum','Diamond','Pro'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Max. rank</label>
              <select value={filteri.rank_max} onChange={(e) => setFilteri({ ...filteri, rank_max: e.target.value })}>
                <option value="">—</option>
                {['Bronze','Silver','Gold','Platinum','Diamond','Pro'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Min. broj članova</label>
              <input type="number" min="1" value={filteri.min_clanova} onChange={(e) => setFilteri({ ...filteri, min_clanova: e.target.value })} />
            </div>
            <div className="field">
              <label>Traže nove igrače</label>
              <select value={filteri.trazi_igrace} onChange={(e) => setFilteri({ ...filteri, trazi_igrace: e.target.value })}>
                <option value="">Svejedno</option>
                <option value="true">Da</option>
              </select>
            </div>
            <div className="field">
              <label>Dan dostupnosti</label>
              <select value={filteri.dan} onChange={(e) => setFilteri({ ...filteri, dan: e.target.value })}>
                <option value="">Svejedno</option>
                {DANI.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="btn" type="submit">Filtriraj</button>
            </div>
          </form>

          {ucitava && <p className="muted">Učitavanje...</p>}
          <div className="grid grid-3">
            {timovi.map((t) => (
              <Link key={t.id} to={`/tim/${t.id}`} className="card">
                <strong>{t.naziv}</strong>
                <p className="muted">{t.Igra?.naziv} · {t.clanovi?.length || 0} članova</p>
                {t.trazi_igrace && <span className="status-pill status-prihvacen">Traži igrače</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
