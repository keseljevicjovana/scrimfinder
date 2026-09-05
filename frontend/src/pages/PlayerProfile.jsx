import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import RankBadge from '../components/RankBadge';
import AvatarSvg from '../avatar/AvatarSvg';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useChatUI } from '../context/ChatUIContext';

export default function PlayerProfile() {
  const { id } = useParams();
  const { korisnik: ja } = useAuth();
  const { promptDialog, toast } = useToast();
  const { otvoriChat } = useChatUI();
  const [podaci, setPodaci] = useState(null);

  useEffect(() => {
    api.get(`/korisnici/${id}`).then((res) => setPodaci(res.data));
  }, [id]);

  const posaljiPoruku = async () => {
    const tekst = await promptDialog('Vaša poruka:');
    if (!tekst || !tekst.trim()) return;
    try {
      const res = await api.post('/chat/direktna', { primalac_id: Number(id), tekst });
      otvoriChat(res.data.konverzacija_id);
    } catch (err) {
      toast(err.response?.data?.poruka || 'Greška prilikom slanja poruke.', 'error');
    }
  };

  if (!podaci) return <div className="container"><p className="muted">Učitavanje...</p></div>;
  const { korisnik, profil, timovi, dostignuca, dostupnost, postotakPrisustva } = podaci;

  const DANI = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <AvatarSvg avatar={korisnik.avatar} pol={korisnik.pol} size={72} />
          <div>
            <h1 style={{ marginBottom: 4 }}>{korisnik.ime}</h1>
            {profil?.Igra && <p className="muted">Omiljena igra: {profil.Igra.naziv}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {postotakPrisustva !== null && (
            <div className="mono" style={{ fontSize: 13 }}>
              <span className="muted">Prisustvo: </span>
              <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>{postotakPrisustva}%</span>
            </div>
          )}
          {ja && ja.id !== Number(id) && (
            <button className="btn btn-sm btn-outline" onClick={posaljiPoruku}>✉ Pošalji poruku</button>
          )}
        </div>
      </div>

      {profil?.bio && <p style={{ marginTop: 16 }}>{profil.bio}</p>}

      <div className="section-heading" style={{ marginTop: 24 }}><div className="bar" /><h2>Timovi ({timovi.length})</h2></div>
      {timovi.length === 0 && <p className="muted">Nije član nijednog tima.</p>}
      <div className="grid grid-2">
        {timovi.map((t) => (
          <Link key={t.tim.id} to={`/tim/${t.tim.id}`} className="card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong>{t.tim.naziv}</strong>
                <p className="muted" style={{ margin: '2px 0' }}>{t.tim.igra} · {t.uloga}{t.pozicija ? ` · ${t.pozicija}` : ''}</p>
              </div>
              <RankBadge rank={t.rank} />
            </div>
            <p className="mono muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              Prisustvovao {t.prisustvovao}/{t.odigranihMeceva} mečeva ovog tima
            </p>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Dostupnost</h3>
        {dostupnost.length === 0 && <p className="muted">Nije unesena dostupnost.</p>}
        {dostupnost.map((d) => (
          <p key={d.id} className="mono">{DANI[d.dan_u_sedmici]} {d.vrijeme_od.slice(0, 5)}–{d.vrijeme_do.slice(0, 5)}</p>
        ))}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Dostignuća</h3>
        {dostignuca.length === 0 && <p className="muted">Još nema osvojenih dostignuća.</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {dostignuca.map((d) => (
            <span key={d.id} className="status-pill status-prihvacen" title={d.opis}>🏆 {d.naziv}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
