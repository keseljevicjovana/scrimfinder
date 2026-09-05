import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function ScrimRequests() {
  const [podaci, setPodaci] = useState(null);
  const [mojiTimovi, setMojiTimovi] = useState([]);
  const [protivnici, setProtivnici] = useState([]);
  const [forma, setForma] = useState({ moj_tim_id: '', protivnik_id: '', predlozeni_termin: '', broj_mapa: 1, pravila: '' });
  const [greska, setGreska] = useState('');
  const [poruka, setPoruka] = useState('');

  const ucitaj = () => api.get('/scrim/zahtjevi/moji').then((res) => setPodaci(res.data));
  useEffect(() => {
    ucitaj();
    api.get('/timovi/moji/lista').then((res) => setMojiTimovi(res.data));
  }, []);

  useEffect(() => {
    if (!forma.moj_tim_id) { setProtivnici([]); return; }
    const mojTim = mojiTimovi.find((t) => t.tim.id === Number(forma.moj_tim_id));
    if (!mojTim) return;
    api.get(`/timovi/pretraga/detaljna?igra_id=${mojTim.tim.igra_id || mojTim.tim.Igra?.id || ''}`).then((res) => {
      setProtivnici(res.data.filter((t) => t.id !== mojTim.tim.id));
    });
  }, [forma.moj_tim_id, mojiTimovi]);

  const odgovori = async (id, odgovor) => {
    await api.put(`/scrim/zahtjevi/${id}`, { odgovor });
    ucitaj();
  };

  const posaljiZahtjev = async (e) => {
    e.preventDefault();
    setGreska(''); setPoruka('');
    try {
      await api.post('/scrim/zahtjevi', {
        tim_posiljalac_id: Number(forma.moj_tim_id),
        tim_primalac_id: Number(forma.protivnik_id),
        predlozeni_termin: forma.predlozeni_termin,
        broj_mapa: Number(forma.broj_mapa),
        pravila: forma.pravila,
      });
      setPoruka('Zahtjev je poslat!');
      setForma({ moj_tim_id: '', protivnik_id: '', predlozeni_termin: '', broj_mapa: 1, pravila: '' });
      ucitaj();
      setTimeout(() => setPoruka(''), 3000);
    } catch (err) {
      setGreska(err.response?.data?.poruka || 'Greška prilikom slanja zahtjeva.');
    }
  };

  if (!podaci) return <div className="container"><p className="muted">Učitavanje...</p></div>;

  return (
    <div className="container" style={{ marginTop: 30, marginBottom: 40 }}>
      <h1>Scrim zahtjevi</h1>
      <p className="muted">Zakazuj mečeve za bilo koji tim čiji si član — ne mora biti tim gdje si kapiten.</p>

      <div className="card" style={{ marginTop: 10 }}>
        <h3>Zakaži novi meč</h3>
        {mojiTimovi.length === 0 && <p className="muted">Nisi član nijednog tima — <Link to="/moji-timovi">napravi ili se pridruži timu</Link> da bi mogao/la da zakažeš meč.</p>}
        {mojiTimovi.length > 0 && (
          <form onSubmit={posaljiZahtjev}>
            <div className="grid grid-2">
              <div className="field">
                <label>Tvoj tim</label>
                <select value={forma.moj_tim_id} onChange={(e) => setForma({ ...forma, moj_tim_id: e.target.value, protivnik_id: '' })} required>
                  <option value="">— Izaberi tim —</option>
                  {mojiTimovi.map((t) => <option key={t.tim.id} value={t.tim.id}>{t.tim.naziv}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Protivnički tim</label>
                <select value={forma.protivnik_id} onChange={(e) => setForma({ ...forma, protivnik_id: e.target.value })} required disabled={!forma.moj_tim_id}>
                  <option value="">{forma.moj_tim_id ? '— Izaberi protivnika —' : 'Prvo izaberi svoj tim'}</option>
                  {protivnici.map((t) => <option key={t.id} value={t.id}>{t.naziv}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Predloženi termin</label>
                <input type="datetime-local" value={forma.predlozeni_termin} onChange={(e) => setForma({ ...forma, predlozeni_termin: e.target.value })} required />
              </div>
              <div className="field">
                <label>Broj mapa</label>
                <input type="number" min="1" max="7" value={forma.broj_mapa} onChange={(e) => setForma({ ...forma, broj_mapa: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Pravila (opciono)</label>
              <textarea rows={2} value={forma.pravila} onChange={(e) => setForma({ ...forma, pravila: e.target.value })} placeholder="npr. Best of 3, MR12..." />
            </div>
            {greska && <p className="error-text">{greska}</p>}
            {poruka && <p style={{ color: 'var(--neon-green)', fontSize: 13 }}>{poruka}</p>}
            <button className="btn" type="submit">Pošalji zahtjev</button>
          </form>
        )}
      </div>

      <div className="section-heading" style={{ marginTop: 28 }}><div className="bar" /><h2>Primljeni</h2></div>
      {podaci.primljeni.length === 0 && <p className="muted">Nema primljenih zahtjeva.</p>}
      {podaci.primljeni.map((z) => (
        <div key={z.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong><Link to={`/tim/${z.posiljalac.id}`}>{z.posiljalac.naziv}</Link></strong> <span className="muted">→</span> {z.primalac.naziv}
              <p className="muted mono">{new Date(z.predlozeni_termin).toLocaleString('sr-RS')} · Bo{z.broj_mapa}</p>
              {z.pravila && <p className="muted">{z.pravila}</p>}
            </div>
            <span className={`status-pill status-${z.status}`}>{z.status.replace('_', ' ')}</span>
          </div>
          {z.status === 'na_cekanju' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-sm" onClick={() => odgovori(z.id, 'prihvacen')}>Prihvati</button>
              <button className="btn btn-sm btn-danger" onClick={() => odgovori(z.id, 'odbijen')}>Odbij</button>
            </div>
          )}
        </div>
      ))}

      <div className="section-heading" style={{ marginTop: 28 }}><div className="bar" /><h2>Poslati</h2></div>
      {podaci.poslati.length === 0 && <p className="muted">Nema poslatih zahtjeva.</p>}
      {podaci.poslati.map((z) => (
        <div key={z.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {z.posiljalac.naziv} <span className="muted">→</span> <strong><Link to={`/tim/${z.primalac.id}`}>{z.primalac.naziv}</Link></strong>
              <p className="muted mono">{new Date(z.predlozeni_termin).toLocaleString('sr-RS')} · Bo{z.broj_mapa}</p>
            </div>
            <span className={`status-pill status-${z.status}`}>{z.status.replace('_', ' ')}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
