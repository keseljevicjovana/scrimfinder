import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import AvatarSvg from '../avatar/AvatarSvg';
import RankBadge from '../components/RankBadge';
import GrbSvg from '../components/GrbSvg';

function GuestHome() {
  return (
    <div className="container" style={{ marginTop: 40 }}>
      <h1 style={{ fontSize: 42 }}>Pronađi protivnika. <span style={{ color: 'var(--accent, var(--neon-cyan))' }}>Odigraj skrim.</span></h1>
      <p className="muted" style={{ maxWidth: 560, fontSize: 16 }}>
        ScrimFinder povezuje kompetitivne e-sport timove — dogovorite termin, pratite statistiku i
        napredujte ka turnirima, sve na jednom mjestu.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Link to="/pretraga" className="btn">Pretraži timove</Link>
        <Link to="/registracija" className="btn btn-outline">Napravi nalog</Link>
      </div>

      <div className="divider" />

      <div className="grid grid-3">
        <div className="card">
          <h3>Dogovorite skrim</h3>
          <p className="muted">Pošaljite zahtjev drugom timu, predložite termin i format, pa igrajte.</p>
        </div>
        <div className="card">
          <h3>Pratite statistiku</h3>
          <p className="muted">K/D/A, win rate i istorija mečeva — automatski, po svakom odigranom meču.</p>
        </div>
        <div className="card">
          <h3>Takmičite se na turnirima</h3>
          <p className="muted">Prijavite tim, pratite bracket uživo i osvojite posebna dostignuća.</p>
        </div>
      </div>
    </div>
  );
}

function vrijemeDoTurnira(datum) {
  const diffMs = new Date(datum) - new Date();
  if (diffMs <= 0) return 'Počinje uskoro';
  const dani = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const sati = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (dani > 0) return `za ${dani}d ${sati}h`;
  return `za ${sati}h`;
}

function DashboardHome() {
  const { korisnik } = useAuth();
  const [profilPodaci, setProfilPodaci] = useState(null);
  const [mojiTimovi, setMojiTimovi] = useState(null);
  const [primarniStat, setPrimarniStat] = useState(null);
  const [turniri, setTurniri] = useState([]);
  const [ucitano, setUcitano] = useState(false);

  useEffect(() => {
    let zivo = true;
    (async () => {
      const [profilRes, turniriRes, mojiTimoviRes] = await Promise.all([
        api.get(`/korisnici/${korisnik.id}`),
        api.get('/turniri'),
        api.get('/timovi/moji/lista'),
      ]);
      if (!zivo) return;
      setProfilPodaci(profilRes.data);
      setMojiTimovi(mojiTimoviRes.data);

      const nadolazeci = turniriRes.data
        .filter((t) => t.status !== 'zavrsen')
        .sort((a, b) => new Date(a.datum) - new Date(b.datum));
      setTurniri(nadolazeci.slice(0, 6));

      const primarni = mojiTimoviRes.data[0];
      if (primarni) {
        const statRes = await api.get(`/timovi/${primarni.tim.id}/statistike`);
        if (zivo) setPrimarniStat({ tim: primarni.tim, ...statRes.data });
      }
      setUcitano(true);
    })();
    return () => { zivo = false; };
  }, [korisnik.id]);

  if (!ucitano || !profilPodaci) {
    return <div className="container" style={{ marginTop: 30 }}><p className="muted">Učitavanje...</p></div>;
  }

  const { dostignuca, postotakPrisustva, timovi } = profilPodaci;
  const ostaliTimovi = (mojiTimovi || []).slice(1);

  return (
    <div className="container fade-in" style={{ marginTop: 30, paddingBottom: 60 }}>
      {/* --- Statistika igrača --- */}
      <div className="stat-hero">
        <div className="stat-hero-head">
          <AvatarSvg avatar={korisnik.avatar} pol={korisnik.pol} size={72} />
          <div>
            <div className="stat-hero-name">{korisnik.ime}</div>
            <div className="stat-hero-sub">Član {timovi.length} tim{timovi.length === 1 ? 'a' : 'ova'}</div>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="label">Tvojih timova</div>
            <div className="value">{timovi.length}</div>
          </div>
          <div className="stat-box">
            <div className="label">% prisustva (svi timovi)</div>
            <div className="value" style={{ color: 'var(--neon-green)' }}>{postotakPrisustva !== null ? `${postotakPrisustva}%` : '—'}</div>
            {postotakPrisustva !== null && <div className="winrate-bar-track"><div className="winrate-bar-fill" style={{ width: `${postotakPrisustva}%` }} /></div>}
          </div>
          <div className="stat-box">
            <div className="label">Dostignuća</div>
            <div className="value" style={{ color: 'var(--neon-yellow)' }}>{dostignuca.length}</div>
          </div>
          <div className="stat-box">
            <div className="label">Kapiten u</div>
            <div className="value">{(mojiTimovi || []).filter((t) => t.jeKapiten).length} tima</div>
          </div>
        </div>
      </div>

      {/* --- Statistika primarnog tima --- */}
      {primarniStat ? (
        <div className="stat-hero" style={{ marginTop: 20 }}>
          <div className="stat-hero-head">
            {primarniStat.tim.grb
              ? <GrbSvg grb={primarniStat.tim.grb} size={56} />
              : <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, border: '1px solid var(--border)' }}>🛡️</div>}
            <div style={{ flex: 1 }}>
              <div className="stat-hero-name"><Link to={`/tim/${primarniStat.tim.id}`} style={{ color: 'inherit' }}>{primarniStat.tim.naziv}</Link></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <RankBadge rank={primarniStat.rank} />
                {primarniStat.trenutniNiz >= 2 && <span className="streak-badge">🔥 {primarniStat.trenutniNiz} pobjeda u nizu</span>}
              </div>
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-box"><div className="label">Poeni</div><div className="value" style={{ color: 'var(--neon-yellow)' }}>{primarniStat.poeni}</div></div>
            <div className="stat-box"><div className="label">Pobjeda</div><div className="value" style={{ color: 'var(--neon-green)' }}>{primarniStat.pobjeda}</div></div>
            <div className="stat-box"><div className="label">Poraza</div><div className="value" style={{ color: 'var(--danger)' }}>{primarniStat.poraza}</div></div>
            <div className="stat-box"><div className="label">Win rate</div><div className="value">{primarniStat.winRate}%</div></div>
          </div>
          {ostaliTimovi.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {ostaliTimovi.map((t) => (
                <Link key={t.tim.id} to={`/tim/${t.tim.id}`} className="status-pill status-na_cekanju" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t.tim.naziv} · {t.rank}
                </Link>
              ))}
              <Link to="/moji-timovi" className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Vidi sve →</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20, textAlign: 'center' }}>
          <p className="muted" style={{ margin: 0 }}>Još uvijek nisi član nijednog tima.</p>
          <Link to="/moji-timovi" className="btn btn-sm" style={{ marginTop: 10 }}>Napravi tim</Link>
        </div>
      )}

      {/* --- Turniri --- */}
      <div className="section-heading"><div className="bar" /><h2>Nadolazeći turniri</h2></div>
      {turniri.length === 0 && <p className="muted">Trenutno nema zakazanih turnira.</p>}
      <div className="tournament-strip">
        {turniri.map((t) => (
          <Link key={t.id} to={`/turnir/${t.id}`} className="tournament-chip">
            <div style={{ fontWeight: 700, fontSize: 14 }}>{t.naziv}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t.Igra?.naziv}</div>
            <div className="countdown">⏱ {vrijemeDoTurnira(t.datum)}</div>
          </Link>
        ))}
      </div>

      {/* --- Brzi linkovi + poslednji mečevi (donji desni dio) --- */}
      <div className="dashboard-columns" style={{ marginTop: 8 }}>
        <div>
          <div className="section-heading"><div className="bar" /><h2>Brzo</h2></div>
          <div className="grid grid-2">
            <Link to="/pretraga" className="card" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 6 }}>🔍 Pretraga</h3>
              <p className="muted" style={{ margin: 0 }}>Nađi timove i igrače po rangu, dostupnosti i igri.</p>
            </Link>
            <Link to="/scrim-zahtjevi" className="card" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 6 }}>⚔️ Scrim zahtjevi</h3>
              <p className="muted" style={{ margin: 0 }}>Pregledaj poslate i primljene zahtjeve za mečeve.</p>
            </Link>
            <Link to="/rangiranje" className="card" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 6 }}>🏆 Rangiranje</h3>
              <p className="muted" style={{ margin: 0 }}>Vidi ko trenutno vodi na leaderboard-u.</p>
            </Link>
            <Link to="/kalendar" className="card" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 6 }}>📅 Kalendar</h3>
              <p className="muted" style={{ margin: 0 }}>Pregledaj sve zakazane mečeve tvojih timova.</p>
            </Link>
            <Link to="/turniri" className="card" style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 6 }}>🎮 Svi turniri</h3>
              <p className="muted" style={{ margin: 0 }}>Kompletna lista, uključujući završene.</p>
            </Link>
          </div>
        </div>

        <div>
          <div className="section-heading"><div className="bar" /><h2>Poslednji mečevi</h2></div>
          {(!primarniStat || primarniStat.istorija.length === 0) && (
            <p className="muted">Nema odigranih mečeva još.</p>
          )}
          {primarniStat && primarniStat.istorija.map((m) => (
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
      </div>
    </div>
  );
}

export default function Home() {
  const { korisnik } = useAuth();
  if (korisnik?.uloga === 'admin') return <Navigate to="/admin" replace />;
  return korisnik ? <DashboardHome /> : <GuestHome />;
}
