import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import RankBadge from '../components/RankBadge';
import GrbSvg from '../components/GrbSvg';

export default function MojiTimovi() {
  const navigate = useNavigate();
  const [timovi, setTimovi] = useState(null);
  const [igre, setIgre] = useState([]);
  const [podaci, setPodaci] = useState({ naziv: '', igra_id: '', opis: '', logo_url: '' });
  const [greska, setGreska] = useState('');

  const ucitaj = () => api.get('/timovi/moji/lista').then((res) => setTimovi(res.data));
  useEffect(() => {
    ucitaj();
    api.get('/igre').then((res) => setIgre(res.data));
  }, []);

  const napraviTim = async (e) => {
    e.preventDefault();
    setGreska('');
    try {
      const res = await api.post('/timovi', podaci);
      navigate(`/tim/${res.data.id}`);
    } catch (err) {
      setGreska(err.response?.data?.poruka || 'Greška prilikom kreiranja tima.');
    }
  };

  return (
    <div className="container fade-in" style={{ marginTop: 30, marginBottom: 40 }}>
      <h1>Moji timovi</h1>
      <p className="muted">Timovi gdje si kapiten idu prvi; ostali su poređani od najaktivnijeg ka najmanje aktivnom.</p>

      {timovi === null && <p className="muted">Učitavanje...</p>}
      {timovi && timovi.length === 0 && <p className="muted">Još uvijek nisi član nijednog tima — napravi svoj prvi tim ispod.</p>}

      {timovi && timovi.map((t) => (
        <Link key={t.tim.id} to={`/tim/${t.tim.id}`} className={`moj-tim-red ${t.jeKapiten ? 'kapiten' : ''}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {t.tim.grb
              ? <GrbSvg grb={t.tim.grb} size={40} />
              : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡️</div>}
            <div>
              {t.jeKapiten && <div className="kapiten-oznaka">★ Kapiten</div>}
              <strong style={{ fontSize: 16 }}>{t.tim.naziv}</strong>
              <p className="muted" style={{ margin: '2px 0 0' }}>{t.tim.Igra?.naziv}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {t.trenutniNiz >= 2 && <span className="streak-badge">🔥 {t.trenutniNiz}</span>}
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 13, color: 'var(--neon-green)' }}>{t.postotakAktivnosti}% aktivnost</div>
              <div className="mono muted" style={{ fontSize: 11 }}>{t.poeni} poena</div>
            </div>
            <RankBadge rank={t.rank} />
          </div>
        </Link>
      ))}

      <div className="divider" />

      <div className="card">
        <h3>Napravi novi tim</h3>
        <form onSubmit={napraviTim}>
          <div className="field">
            <label>Naziv tima</label>
            <input value={podaci.naziv} onChange={(e) => setPodaci({ ...podaci, naziv: e.target.value })} required />
          </div>
          <div className="field">
            <label>Igra</label>
            <select value={podaci.igra_id} onChange={(e) => setPodaci({ ...podaci, igra_id: e.target.value })} required>
              <option value="">— Izaberite igru —</option>
              {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Opis</label>
            <textarea rows={3} value={podaci.opis} onChange={(e) => setPodaci({ ...podaci, opis: e.target.value })} />
          </div>
          <div className="field">
            <label>URL logotipa (opciono)</label>
            <input value={podaci.logo_url} onChange={(e) => setPodaci({ ...podaci, logo_url: e.target.value })} />
          </div>
          {greska && <p className="error-text">{greska}</p>}
          <button className="btn" type="submit">Kreiraj tim</button>
        </form>
      </div>
    </div>
  );
}
