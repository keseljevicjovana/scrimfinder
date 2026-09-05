import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function AdminDashboard() {
  const { toast, confirmDialog } = useToast();
  const [stats, setStats] = useState(null);
  const [korisnici, setKorisnici] = useState([]);
  const [prijave, setPrijave] = useState([]);
  const [igre, setIgre] = useState([]);
  const [sporniMecevi, setSporniMecevi] = useState([]);
  const [novaIgra, setNovaIgra] = useState({ naziv: '', ima_pozicije: false });
  const [novoDostignuce, setNovoDostignuce] = useState({ naziv: '', opis: '', uslov_tip: 'odigranih_meceva', uslov_vrijednost: 10 });
  const [noviTurnir, setNoviTurnir] = useState({ naziv: '', igra_id: '', datum: '', max_timova: 4, format: 'single_elimination' });
  const [tab, setTab] = useState('pregled');

  const ucitajSve = () => {
    api.get('/admin/dashboard').then((res) => setStats(res.data));
    api.get('/admin/korisnici').then((res) => setKorisnici(res.data));
    api.get('/prijave').then((res) => setPrijave(res.data));
    api.get('/igre').then((res) => setIgre(res.data));
    api.get('/scrim/sporni/lista').then((res) => setSporniMecevi(res.data));
  };
  useEffect(ucitajSve, []);

  const rijesiSpor = async (mecId, ishod) => {
    await api.put(`/scrim/mecevi/${mecId}/rijesi-spor`, { ishod });
    ucitajSve();
  };

  const obrisiKorisnika = async (id) => {
    if (!await confirmDialog('Obrisati korisnika?')) return;
    await api.delete(`/admin/korisnici/${id}`);
    ucitajSve();
  };

  const rijesiPrijavu = async (id) => {
    await api.put(`/prijave/${id}/rijesi`);
    ucitajSve();
  };

  const ignorisiPrijavu = async (id) => {
    await api.put(`/prijave/${id}/ignorisi`);
    ucitajSve();
  };

  const obrisiSadrzaj = async (id) => {
    if (!await confirmDialog('Obrisati prijavljeni komentar trajno?')) return;
    await api.delete(`/prijave/${id}/sadrzaj`);
    ucitajSve();
  };

  const napraviIgru = async (e) => {
    e.preventDefault();
    await api.post('/igre', novaIgra);
    setNovaIgra({ naziv: '', ima_pozicije: false });
    ucitajSve();
  };

  const napraviDostignuce = async (e) => {
    e.preventDefault();
    await api.post('/dostignuca', novoDostignuce);
    setNovoDostignuce({ naziv: '', opis: '', uslov_tip: 'odigranih_meceva', uslov_vrijednost: 10 });
    toast('Dostignuće je kreirano.', 'success');
  };

  const napraviTurnir = async (e) => {
    e.preventDefault();
    await api.post('/turniri', noviTurnir);
    setNoviTurnir({ naziv: '', igra_id: '', datum: '', max_timova: 4, format: 'single_elimination' });
    toast('Turnir je kreiran.', 'success');
  };

  if (!stats) return <div className="container"><p className="muted">Učitavanje...</p></div>;

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>Admin panel</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['pregled', 'korisnici', 'prijave', 'sporni', 'igre', 'dostignuca', 'turniri'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? '' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'sporni' && sporniMecevi.length > 0 ? `${t} (${sporniMecevi.length})` : t}
          </button>
        ))}
      </div>

      {tab === 'pregled' && (
        <div className="grid grid-3">
          <div className="card"><div className="muted">Korisnika</div><div className="mono" style={{ fontSize: 28 }}>{stats.brojKorisnika}</div></div>
          <div className="card"><div className="muted">Timova</div><div className="mono" style={{ fontSize: 28 }}>{stats.brojTimova}</div></div>
          <div className="card"><div className="muted">Mečeva</div><div className="mono" style={{ fontSize: 28 }}>{stats.brojMeceva}</div></div>
          <div className="card"><div className="muted">Turnira</div><div className="mono" style={{ fontSize: 28 }}>{stats.brojTurnira}</div></div>
          <div className="card"><div className="muted">Prijava na čekanju</div><div className="mono" style={{ fontSize: 28, color: 'var(--warn)' }}>{stats.prijaveNaCekanju}</div></div>
          <div className="card"><div className="muted">Sporni mečevi</div><div className="mono" style={{ fontSize: 28, color: 'var(--danger)' }}>{stats.sporniMecevi}</div></div>
        </div>
      )}

      {tab === 'sporni' && (
        <div className="card">
          {sporniMecevi.length === 0 && <p className="muted">Nema spornih mečeva. 🎉</p>}
          {sporniMecevi.map((m) => (
            <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <p style={{ margin: 0 }}>
                <Link to={`/mec/${m.id}`}><strong>{m.tim1?.naziv}</strong> vs <strong>{m.tim2?.naziv}</strong></Link>
                <span className="muted"> — {new Date(m.zakazano_za).toLocaleDateString('sr-RS')}</span>
              </p>
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
                {m.tim1?.naziv} je glasao: <strong>{m.glas_tim1}</strong> · {m.tim2?.naziv} je glasao: <strong>{m.glas_tim2}</strong>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm" onClick={() => rijesiSpor(m.id, 'tim1')}>{m.tim1?.naziv} pobijedio</button>
                <button className="btn btn-sm" onClick={() => rijesiSpor(m.id, 'tim2')}>{m.tim2?.naziv} pobijedio</button>
                <button className="btn btn-sm btn-outline" onClick={() => rijesiSpor(m.id, 'nerijeseno')}>Nerešeno</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'korisnici' && (
        <div className="card">
          {korisnici.map((k) => (
            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{k.ime} <span className="muted">({k.email}) — {k.uloga}</span></span>
              <button className="btn btn-sm btn-danger" onClick={() => obrisiKorisnika(k.id)}>Obriši</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'prijave' && (
        <div className="card">
          {prijave.length === 0 && <p className="muted">Nema prijava.</p>}
          {prijave.map((p) => (
            <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p style={{ margin: 0 }}><strong>{p.entitet_tip === 'komentar' ? 'Prijavljen komentar' : 'Prijavljen korisnik'}</strong> — prijavio: {p.prijavio?.ime}</p>
                <span className={`status-pill status-${p.status === 'rijeseno' ? 'prihvacen' : p.status === 'ignorisano' ? 'otkazan' : 'na_cekanju'}`}>{p.status}</span>
              </div>
              <p className="muted" style={{ margin: '4px 0' }}>Razlog: {p.razlog || '(nije naveden)'}</p>

              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginTop: 6 }}>
                {p.sadrzaj?.obrisan && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sadržaj je već obrisan.</p>}
                {p.entitet_tip === 'komentar' && !p.sadrzaj?.obrisan && (
                  <p style={{ margin: 0, fontSize: 13 }}><em>"{p.sadrzaj?.tekst}"</em> — <Link to={`/igrac/${p.sadrzaj?.autor?.id}`}>{p.sadrzaj?.autor?.ime}</Link></p>
                )}
                {p.entitet_tip === 'korisnik' && !p.sadrzaj?.obrisan && (
                  <p style={{ margin: 0, fontSize: 13 }}>Profil: <Link to={`/igrac/${p.sadrzaj?.korisnik?.id}`}>{p.sadrzaj?.korisnik?.ime}</Link> ({p.sadrzaj?.korisnik?.email})</p>
                )}
              </div>

              {p.status === 'na_cekanju' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-sm" onClick={() => rijesiPrijavu(p.id)}>Riješeno</button>
                  <button className="btn btn-sm btn-outline" onClick={() => ignorisiPrijavu(p.id)}>Ignoriši</button>
                  {p.entitet_tip === 'komentar' && !p.sadrzaj?.obrisan && (
                    <button className="btn btn-sm btn-danger" onClick={() => obrisiSadrzaj(p.id)}>Obriši komentar</button>
                  )}
                </div>
              )}
              {p.status !== 'na_cekanju' && p.rijesioAdmin && (
                <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Riješio/la: {p.rijesioAdmin.ime}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'igre' && (
        <div className="card">
          <h3>Postojeće igre</h3>
          {igre.map((i) => <p key={i.id}>{i.naziv} {i.ima_pozicije && <span className="muted">(ima pozicije)</span>}</p>)}
          <div className="divider" />
          <h3>Nova igra</h3>
          <form onSubmit={napraviIgru} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Naziv</label>
              <input value={novaIgra.naziv} onChange={(e) => setNovaIgra({ ...novaIgra, naziv: e.target.value })} required />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={novaIgra.ima_pozicije} onChange={(e) => setNovaIgra({ ...novaIgra, ima_pozicije: e.target.checked })} /> Ima pozicije
            </label>
            <button className="btn btn-sm" type="submit">Dodaj</button>
          </form>
        </div>
      )}

      {tab === 'dostignuca' && (
        <div className="card">
          <h3>Novo dostignuće</h3>
          <form onSubmit={napraviDostignuce}>
            <div className="field"><label>Naziv</label><input value={novoDostignuce.naziv} onChange={(e) => setNovoDostignuce({ ...novoDostignuce, naziv: e.target.value })} required /></div>
            <div className="field"><label>Opis</label><textarea value={novoDostignuce.opis} onChange={(e) => setNovoDostignuce({ ...novoDostignuce, opis: e.target.value })} /></div>
            <div className="field">
              <label>Tip uslova</label>
              <select value={novoDostignuce.uslov_tip} onChange={(e) => setNovoDostignuce({ ...novoDostignuce, uslov_tip: e.target.value })}>
                <option value="odigranih_meceva">Odigranih mečeva</option>
                <option value="pobjeda">Broj pobjeda</option>
                <option value="win_rate">Win rate (%)</option>
                <option value="osvojen_turnir">Osvojen turnir</option>
              </select>
            </div>
            <div className="field"><label>Vrijednost</label><input type="number" value={novoDostignuce.uslov_vrijednost} onChange={(e) => setNovoDostignuce({ ...novoDostignuce, uslov_vrijednost: Number(e.target.value) })} /></div>
            <button className="btn" type="submit">Kreiraj dostignuće</button>
          </form>
        </div>
      )}

      {tab === 'turniri' && (
        <div className="card">
          <h3>Novi turnir</h3>
          <form onSubmit={napraviTurnir}>
            <div className="field"><label>Naziv</label><input value={noviTurnir.naziv} onChange={(e) => setNoviTurnir({ ...noviTurnir, naziv: e.target.value })} required /></div>
            <div className="field">
              <label>Igra</label>
              <select value={noviTurnir.igra_id} onChange={(e) => setNoviTurnir({ ...noviTurnir, igra_id: e.target.value })} required>
                <option value="">—</option>
                {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
              </select>
            </div>
            <div className="field"><label>Datum</label><input type="datetime-local" value={noviTurnir.datum} onChange={(e) => setNoviTurnir({ ...noviTurnir, datum: e.target.value })} required /></div>
            <div className="field"><label>Max. timova</label><input type="number" value={noviTurnir.max_timova} onChange={(e) => setNoviTurnir({ ...noviTurnir, max_timova: Number(e.target.value) })} /></div>
            <button className="btn" type="submit">Kreiraj turnir</button>
          </form>
        </div>
      )}
    </div>
  );
}
