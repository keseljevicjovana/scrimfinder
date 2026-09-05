import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import RankBadge from '../components/RankBadge';
import CommentSection from '../components/CommentSection';
import GrbSvg from '../components/GrbSvg';
import GrbEditor from '../components/GrbEditor';

export default function TeamProfile() {
  const { id } = useParams();
  const { korisnik } = useAuth();
  const [tim, setTim] = useState(null);
  const [stat, setStat] = useState(null);
  const [pozivKorisnikId, setPozivKorisnikId] = useState('');
  const [urediGrb, setUrediGrb] = useState(false);

  const ucitaj = () => {
    api.get(`/timovi/${id}`).then((res) => setTim(res.data));
    api.get(`/timovi/${id}/statistike`).then((res) => setStat(res.data));
  };
  useEffect(() => { ucitaj(); }, [id]);

  if (!tim) return <div className="container"><p className="muted">Učitavanje...</p></div>;
  const jeKapiten = korisnik && tim.kapiten?.id === korisnik.id;

  const posaljiPozivnicu = async (e) => {
    e.preventDefault();
    if (!pozivKorisnikId) return;
    await api.post(`/timovi/${id}/pozivnice`, { korisnik_id: Number(pozivKorisnikId) });
    alert('Pozivnica je poslata.');
    setPozivKorisnikId('');
  };

  const apliciraj = async () => {
    await api.post(`/timovi/${id}/aplikacije`, { poruka: 'Želim da se pridružim timu.' });
    alert('Aplikacija je poslata kapitenu.');
  };

  const ukloniClana = async (korisnikId) => {
    if (!confirm('Ukloniti ovog igrača iz tima?')) return;
    await api.delete(`/timovi/${id}/clanovi/${korisnikId}`);
    ucitaj();
  };

  const prijaviTim = async () => {
    const razlog = prompt('Razlog prijave tima:');
    if (razlog === null) return;
    await api.post('/prijave', { entitet_tip: 'korisnik', entitet_id: tim.kapiten.id, razlog });
    alert('Prijava je poslata administratoru.');
  };

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {tim.grb
            ? <GrbSvg grb={tim.grb} size={64} />
            : <div style={{ width: 64, height: 64, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid var(--border)' }}>🛡️</div>}
          <div>
            <h1 style={{ marginBottom: 4 }}>{tim.naziv}</h1>
            <p className="muted">{tim.Igra?.naziv} · Kapiten: <Link to={`/igrac/${tim.kapiten?.id}`}>{tim.kapiten?.ime}</Link></p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {tim.trazi_igrace && <span className="status-pill status-prihvacen">Traži igrače</span>}
          {jeKapiten && <button className="btn btn-sm btn-outline" onClick={() => setUrediGrb((v) => !v)}>{tim.grb ? 'Uredi grb' : 'Napravi grb'}</button>}
        </div>
      </div>

      {urediGrb && jeKapiten && (
        <div className="card" style={{ marginTop: 16 }}>
          <GrbEditor timId={tim.id} pocetniGrb={tim.grb} onSacuvano={(grb) => { setTim({ ...tim, grb }); setUrediGrb(false); }} />
        </div>
      )}

      {tim.opis && <p style={{ marginTop: 16 }}>{tim.opis}</p>}

      {stat && (
        <div className="stat-hero" style={{ marginTop: 16 }}>
          <div className="stat-hero-head">
            {tim.grb
              ? <GrbSvg grb={tim.grb} size={56} />
              : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1px solid var(--border)' }}>🛡️</div>}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RankBadge rank={stat.rank} />
                {stat.trenutniNiz >= 2 && <span className="streak-badge">🔥 {stat.trenutniNiz} pobjeda u nizu</span>}
              </div>
              {stat.sledeciRank && (
                <div className="progress-do-ranga">
                  <div className="track"><div className="fill" style={{ width: `${Math.min(100, (stat.poeni / (stat.poeni + stat.poenaDoSledecegRanga)) * 100)}%` }} /></div>
                  <div className="label"><span>{stat.poeni} poena</span><span>još {stat.poenaDoSledecegRanga} do {stat.sledeciRank}</span></div>
                </div>
              )}
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-box"><div className="label">Odigranih</div><div className="value">{stat.odigranihMeceva}</div></div>
            <div className="stat-box"><div className="label">Pobjeda</div><div className="value" style={{ color: 'var(--neon-green)' }}>{stat.pobjeda}</div></div>
            <div className="stat-box"><div className="label">Poraza</div><div className="value" style={{ color: 'var(--danger)' }}>{stat.poraza}</div></div>
            <div className="stat-box"><div className="label">Win rate</div><div className="value">{stat.winRate}%</div></div>
          </div>
        </div>
      )}

      {korisnik && !jeKapiten && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn" onClick={apliciraj}>Prijavi se za tim</button>
          <button className="btn btn-outline" onClick={prijaviTim}>Prijavi kapitena</button>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Članovi ({tim.clanovi?.length || 0})</h3>
        {tim.clanovi?.map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <Link to={`/igrac/${c.Korisnik?.id}`}>{c.Korisnik?.ime}</Link>
              {c.Pozicija && <span className="muted"> · {c.Pozicija.naziv}</span>}
            </div>
            {jeKapiten && c.Korisnik?.id !== tim.kapiten.id && (
              <button className="btn btn-sm btn-danger" onClick={() => ukloniClana(c.Korisnik.id)}>Ukloni</button>
            )}
          </div>
        ))}
      </div>

      {jeKapiten && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Pozovi igrača</h3>
          <form onSubmit={posaljiPozivnicu} style={{ display: 'flex', gap: 8 }}>
            <input type="number" placeholder="ID korisnika" value={pozivKorisnikId} onChange={(e) => setPozivKorisnikId(e.target.value)} />
            <button className="btn btn-sm" type="submit">Pošalji pozivnicu</button>
          </form>
          <p className="muted" style={{ marginTop: 8 }}>Savjet: ID igrača se vidi na njegovom profilu (u URL adresi).</p>
        </div>
      )}

      {stat && stat.istorija.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Poslednji mečevi</h3>
          {stat.istorija.map((m) => (
            <Link key={m.mec_id} to={`/mec/${m.mec_id}`} className="mini-match-row" style={{ color: 'inherit' }}>
              <div>
                <span className={m.ishod === 'pobjeda' ? 'result-w' : m.ishod === 'poraz' ? 'result-l' : ''} style={m.ishod === 'nerijeseno' ? { color: 'var(--warn)', fontWeight: 700 } : undefined}>
                  {m.ishod === 'pobjeda' ? 'W' : m.ishod === 'poraz' ? 'L' : 'N'}
                </span>
                <span className="vs">vs</span>
                <strong>{m.protivnik?.naziv || '—'}</strong>
              </div>
              <div className="muted mono" style={{ fontSize: 11 }}>{new Date(m.datum).toLocaleDateString('sr-RS')}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="divider" />
      <CommentSection entitetTip="tim" entitetId={tim.id} />
    </div>
  );
}
