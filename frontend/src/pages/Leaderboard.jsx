import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import RankBadge from '../components/RankBadge';
import AvatarSvg from '../avatar/AvatarSvg';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { korisnik } = useAuth();
  const [rezim, setRezim] = useState('timovi'); // 'timovi' | 'igraci'
  const [timovi, setTimovi] = useState([]);
  const [igraci, setIgraci] = useState([]);
  const [igre, setIgre] = useState([]);
  const [igraId, setIgraId] = useState('');
  const [mojiTimoviIds, setMojiTimoviIds] = useState(new Set());

  useEffect(() => { api.get('/igre').then((res) => setIgre(res.data)); }, []);
  useEffect(() => {
    api.get(`/dostignuca/rangiranje/timovi${igraId ? `?igra_id=${igraId}` : ''}`).then((res) => setTimovi(res.data));
  }, [igraId]);
  useEffect(() => {
    api.get('/dostignuca/rangiranje/igraci').then((res) => setIgraci(res.data));
  }, []);
  useEffect(() => {
    if (!korisnik) return;
    api.get('/timovi/moji/lista').then((res) => setMojiTimoviIds(new Set(res.data.map((t) => t.tim.id))));
  }, [korisnik]);

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>Rangiranje</h1>

      <div className="rang-tabovi">
        <button className={`btn ${rezim === 'timovi' ? '' : 'btn-outline'}`} onClick={() => setRezim('timovi')}>Timovi</button>
        <button className={`btn ${rezim === 'igraci' ? '' : 'btn-outline'}`} onClick={() => setRezim('igraci')}>Igrači</button>
      </div>

      {rezim === 'timovi' && (
        <>
          <div className="field" style={{ maxWidth: 260 }}>
            <label>Igra</label>
            <select value={igraId} onChange={(e) => setIgraId(e.target.value)}>
              <option value="">Sve igre</option>
              {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
            </select>
          </div>
          <div className="card">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="muted" style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase' }}>
                  <th style={{ padding: 8 }}>#</th>
                  <th>Tim</th>
                  <th>Igra</th>
                  <th>Rank</th>
                  <th>Poeni</th>
                  <th>Niz</th>
                  <th>Mečeva</th>
                  <th>Win rate</th>
                </tr>
              </thead>
              <tbody>
                {timovi.map((t, idx) => {
                  const mojTim = mojiTimoviIds.has(t.tim.id);
                  return (
                    <tr key={t.tim.id} className={mojTim ? 'rang-red-istaknut' : ''} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="mono" style={{ padding: 8 }}>{idx + 1}</td>
                      <td><Link to={`/tim/${t.tim.id}`}>{mojTim && '★ '}{t.tim.naziv}</Link></td>
                      <td className="muted">{t.igra}</td>
                      <td><RankBadge rank={t.rank} /></td>
                      <td className="mono" style={{ color: 'var(--neon-yellow)' }}>{t.poeni}</td>
                      <td className="mono">{t.trenutniNiz >= 2 ? `🔥 ${t.trenutniNiz}` : '—'}</td>
                      <td className="mono">{t.odigranihMeceva}</td>
                      <td className="mono" style={{ color: 'var(--accent)' }}>{t.winRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {timovi.length === 0 && <p className="muted">Nema odigranih mečeva.</p>}
          </div>
        </>
      )}

      {rezim === 'igraci' && (
        <div className="card">
          <p className="muted" style={{ marginTop: -4 }}>Rangirano po % prisustva zakazanim mečevima svih svojih timova — mjeri posvećenost, ne individualnu vještinu.</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr className="muted" style={{ textAlign: 'left', fontSize: 12, textTransform: 'uppercase' }}>
                <th style={{ padding: 8 }}>#</th>
                <th>Igrač</th>
                <th>Timova</th>
                <th>Prisustvovao</th>
                <th>% prisustva</th>
              </tr>
            </thead>
            <tbody>
              {igraci.map((l, idx) => {
                const jaSam = korisnik && l.korisnik.id === korisnik.id;
                return (
                  <tr key={l.korisnik.id} className={jaSam ? 'rang-red-istaknut' : ''} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="mono" style={{ padding: 8 }}>{idx + 1}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                      <AvatarSvg avatar={l.korisnik.avatar} pol={l.korisnik.pol} size={26} glow={false} />
                      <Link to={`/igrac/${l.korisnik.id}`}>{jaSam && '★ '}{l.korisnik.ime}</Link>
                    </td>
                    <td className="mono">{l.brojTimova}</td>
                    <td className="mono">{l.prisustvovao}/{l.odigranoUkupno}</td>
                    <td className="mono" style={{ color: 'var(--neon-green)' }}>{l.postotakPrisustva}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {igraci.length === 0 && <p className="muted">Nema podataka još.</p>}
        </div>
      )}
    </div>
  );
}
