import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AvatarSvg from '../avatar/AvatarSvg';

export default function CommentSection({ entitetTip, entitetId }) {
  const { korisnik } = useAuth();
  const [komentari, setKomentari] = useState([]);
  const [tekst, setTekst] = useState('');

  const ucitaj = () => {
    api.get(`/komentari/${entitetTip}/${entitetId}`).then((res) => setKomentari(res.data));
  };
  useEffect(ucitaj, [entitetTip, entitetId]);

  const posalji = async (e) => {
    e.preventDefault();
    if (!tekst.trim()) return;
    await api.post(`/komentari/${entitetTip}/${entitetId}`, { tekst });
    setTekst('');
    ucitaj();
  };

  const lajkuj = async (id) => {
    await api.post(`/komentari/${id}/lajk`);
    ucitaj();
  };

  const prijaviKomentar = async (id) => {
    const razlog = prompt('Razlog prijave komentara:');
    if (razlog === null) return;
    await api.post('/prijave', { entitet_tip: 'komentar', entitet_id: id, razlog });
    alert('Prijava je poslata administratoru.');
  };

  return (
    <div>
      <h3>Komentari</h3>
      {korisnik && (
        <form onSubmit={posalji} className="field" style={{ display: 'flex', gap: 8 }}>
          <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Napišite komentar..." />
          <button className="btn btn-sm" type="submit">Pošalji</button>
        </form>
      )}
      {komentari.length === 0 && <p className="muted">Još nema komentara.</p>}
      {komentari.map((k) => (
        <div key={k.id} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AvatarSvg avatar={k.autor?.avatar} pol={k.autor?.pol} size={24} glow={false} />
              <strong>{k.autor?.ime}</strong>
            </div>
            <span className="muted mono">{new Date(k.created_at).toLocaleDateString('sr-RS')}</span>
          </div>
          <p>{k.tekst}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-outline btn-sm" onClick={() => lajkuj(k.id)}>👍 {k.lajkovi?.length || 0}</button>
            {korisnik && <button className="btn btn-outline btn-sm" onClick={() => prijaviKomentar(k.id)}>Prijavi</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
