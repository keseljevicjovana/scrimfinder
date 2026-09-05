import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function TournamentDetail() {
  const { id } = useParams();
  const { korisnik } = useAuth();
  const { toast, izborDialog, promptDialog } = useToast();
  const [turnir, setTurnir] = useState(null);
  const [mojiTimovi, setMojiTimovi] = useState([]);
  const [timId, setTimId] = useState('');

  const ucitaj = () => api.get(`/turniri/${id}`).then((res) => setTurnir(res.data));
  useEffect(() => { ucitaj(); }, [id]);
  useEffect(() => {
    if (!korisnik) return;
    api.get('/timovi/moji/lista').then((res) => setMojiTimovi(res.data));
  }, [korisnik]);

  if (!turnir) return <div className="container"><p className="muted">Učitavanje...</p></div>;

  // Samo timovi ISTE igre kao turnir, i gdje je korisnik kapiten (prijava tima je kapitenska odluka).
  const timoviZaPrijavu = mojiTimovi.filter((t) => t.jeKapiten && t.tim.igra_id === turnir.igra_id);

  const prijaviTim = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/turniri/${id}/prijava`, { tim_id: Number(timId) });
      ucitaj();
      setTimId('');
    } catch (err) {
      toast(err.response?.data?.poruka || 'Greška prilikom prijave.', 'error');
    }
  };

  const generisiBracket = async () => {
    try {
      await api.post(`/turniri/${id}/bracket`);
      ucitaj();
    } catch (err) {
      toast(err.response?.data?.poruka || 'Greška prilikom generisanja bracketa.', 'error');
    }
  };

  const unesiRezultat = async (slotId, tim1, tim2) => {
    const pobjednikId = await izborDialog('Ko je pobijedio?', [
      { label: tim1.naziv, value: tim1.id },
      { label: tim2.naziv, value: tim2.id },
    ]);
    if (!pobjednikId) return;
    const rezultat = await promptDialog('Rezultat (npr. 2-1):') || '';
    await api.put(`/turniri/bracket/${slotId}/rezultat`, { pobjednik_tim_id: pobjednikId, rezultat });
    ucitaj();
  };

  const runde = {};
  (turnir.bracket || []).forEach((slot) => {
    runde[slot.runda_broj] = runde[slot.runda_broj] || [];
    runde[slot.runda_broj].push(slot);
  });

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <h1>{turnir.naziv}</h1>
      <p className="muted">{turnir.Igra?.naziv} · {new Date(turnir.datum).toLocaleDateString('sr-RS')} · Max {turnir.max_timova} timova</p>
      <span className="status-pill status-prihvacen">{turnir.status.replace('_', ' ')}</span>

      {turnir.status === 'prijave_otvorene' && korisnik && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Prijavi tim</h3>
          {timoviZaPrijavu.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nemaš tim koji igra {turnir.Igra?.naziv} gdje si kapiten — samo kapiten može prijaviti tim na turnir.
            </p>
          ) : (
            <form onSubmit={prijaviTim} style={{ display: 'flex', gap: 8 }}>
              <select value={timId} onChange={(e) => setTimId(e.target.value)} required style={{ maxWidth: 260 }}>
                <option value="">— Izaberi svoj tim —</option>
                {timoviZaPrijavu.map((t) => <option key={t.tim.id} value={t.tim.id}>{t.tim.naziv}</option>)}
              </select>
              <button className="btn btn-sm" type="submit">Prijavi tim</button>
            </form>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Prijavljeni timovi ({turnir.TurnirPrijavas?.length || 0}/{turnir.max_timova})</h3>
        {(turnir.TurnirPrijavas || []).map((p) => <p key={p.id}>{p.Tim?.naziv}</p>)}
        {korisnik?.uloga === 'admin' && turnir.status === 'prijave_otvorene' && (
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={generisiBracket}>Generiši bracket</button>
        )}
      </div>

      {Object.keys(runde).length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Bracket</h3>
          <div className="bracket">
            {Object.keys(runde).sort((a, b) => a - b).map((r) => (
              <div className="bracket-round" key={r}>
                <p className="muted mono">Runda {r}</p>
                {runde[r].map((slot) => (
                  <div className="bracket-slot" key={slot.id}>
                    <div className={`bracket-team ${slot.mec_id && slot.mec_id ? '' : ''}`}>
                      {slot.tim1?.naziv || 'TBD'}
                    </div>
                    <div className="bracket-team">{slot.tim2?.naziv || 'TBD'}</div>
                    {slot.tim1_id && slot.tim2_id && !slot.mec_id && korisnik && (
                      <button className="btn btn-sm btn-outline" style={{ marginTop: 6 }} onClick={() => unesiRezultat(slot.id, slot.tim1, slot.tim2)}>
                        Unesi rezultat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
