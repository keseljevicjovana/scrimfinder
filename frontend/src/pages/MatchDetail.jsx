import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CommentSection from '../components/CommentSection';
import AvatarSvg from '../avatar/AvatarSvg';

const STATUS_TEKST = { zakazan: 'Zakazan', odigran: 'Odigran', otkazan: 'Otkazan', sporno: 'Sporno — čeka admina' };

export default function MatchDetail() {
  const { id } = useParams();
  const { korisnik } = useAuth();
  const [mec, setMec] = useState(null);

  const ucitaj = () => api.get(`/scrim/mecevi/${id}`).then((res) => setMec(res.data));
  useEffect(() => { ucitaj(); }, [id]);

  if (!mec) return <div className="container"><p className="muted">Učitavanje...</p></div>;

  const jeTim1Kapiten = korisnik && mec.tim1?.kapiten_id === korisnik.id;
  const jeTim2Kapiten = korisnik && mec.tim2?.kapiten_id === korisnik.id;
  const jeKapiten = jeTim1Kapiten || jeTim2Kapiten;
  const mojGlas = jeTim1Kapiten ? mec.glas_tim1 : jeTim2Kapiten ? mec.glas_tim2 : null;
  const vremeProslo = new Date(mec.zakazano_za) <= new Date();

  const mojePrisustvo = mec.prisustva?.find((p) => p.korisnik_id === korisnik?.id);

  const glasaj = async (glas) => {
    await api.put(`/scrim/mecevi/${id}/glasaj`, { glas });
    ucitaj();
  };

  const azurirajPrisustvo = async (status) => {
    await api.put(`/scrim/mecevi/${id}/prisustvo`, { status });
    ucitaj();
  };

  const rijesiSpor = async (ishod) => {
    await api.put(`/scrim/mecevi/${id}/rijesi-spor`, { ishod });
    ucitaj();
  };

  return (
    <div className="container" style={{ marginTop: 30 }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{mec.tim1?.naziv} <span className="muted">vs</span> {mec.tim2?.naziv}</h1>
          <span className={`status-pill status-${mec.status === 'sporno' ? 'odbijen' : mec.status === 'odigran' ? 'prihvacen' : 'na_cekanju'}`}>{STATUS_TEKST[mec.status]}</span>
        </div>
        <p className="muted mono">{new Date(mec.zakazano_za).toLocaleString('sr-RS')}</p>
        {mec.status === 'odigran' && (
          <p>
            Ishod: <strong>{mec.ishod === 'nerijeseno' ? 'Nerešeno' : `Pobjednik — ${mec.pobjednik?.naziv}`}</strong>
          </p>
        )}
      </div>

      {mojePrisustvo && mojePrisustvo.status === 'na_cekanju' && (
        <div className="prisustvo-pitanje">
          <span>Možeš li prisustvovati ovom meču?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => azurirajPrisustvo('moze')}>Mogu</button>
            <button className="btn btn-sm btn-outline" onClick={() => azurirajPrisustvo('ne_moze')}>Ne mogu</button>
          </div>
        </div>
      )}
      {mojePrisustvo && mojePrisustvo.status !== 'na_cekanju' && (
        <p className="muted" style={{ marginTop: 10 }}>
          Tvoj odgovor na prisustvo: <strong style={{ color: mojePrisustvo.status === 'moze' ? 'var(--neon-green)' : 'var(--danger)' }}>{mojePrisustvo.status === 'moze' ? 'Mogu prisustvovati' : 'Ne mogu prisustvovati'}</strong>
        </p>
      )}

      {jeKapiten && mec.status !== 'odigran' && mec.status !== 'otkazan' && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Glasaj o rezultatu</h3>
          {!vremeProslo && <p className="muted">Glasanje je moguće tek nakon zakazanog termina meča.</p>}
          {vremeProslo && (
            <>
              <p className="muted" style={{ marginTop: -4 }}>Glasaš iz perspektive SVOG tima ({jeTim1Kapiten ? mec.tim1.naziv : mec.tim2.naziv}).</p>
              <div className="glasanje-grid">
                <button disabled={!vremeProslo} className={`glas-btn pobjeda ${mojGlas === 'pobjeda' ? 'izabrano' : ''}`} onClick={() => glasaj('pobjeda')}>Pobjeda</button>
                <button disabled={!vremeProslo} className={`glas-btn poraz ${mojGlas === 'poraz' ? 'izabrano' : ''}`} onClick={() => glasaj('poraz')}>Poraz</button>
                <button disabled={!vremeProslo} className={`glas-btn nerijeseno ${mojGlas === 'nerijeseno' ? 'izabrano' : ''}`} onClick={() => glasaj('nerijeseno')}>Nerešeno</button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                {mec.glas_tim1 ? `${mec.tim1.naziv} je glasao/la.` : `${mec.tim1.naziv} još nije glasao/la.`}{' '}
                {mec.glas_tim2 ? `${mec.tim2.naziv} je glasao/la.` : `${mec.tim2.naziv} još nije glasao/la.`}
              </p>
            </>
          )}
        </div>
      )}

      {mec.status === 'sporno' && (
        <div className="spor-banner">
          Kapiteni se ne slažu oko rezultata ({mec.tim1.naziv}: {mec.glas_tim1}, {mec.tim2.naziv}: {mec.glas_tim2}). Čeka se odluka administratora.
        </div>
      )}
      {mec.status === 'sporno' && korisnik?.uloga === 'admin' && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Admin — riješi spor</h3>
          <div className="glasanje-grid">
            <button className="glas-btn pobjeda" onClick={() => rijesiSpor('tim1')}>{mec.tim1.naziv} pobijedio</button>
            <button className="glas-btn poraz" onClick={() => rijesiSpor('tim2')}>{mec.tim2.naziv} pobijedio</button>
            <button className="glas-btn nerijeseno" onClick={() => rijesiSpor('nerijeseno')}>Nerešeno</button>
          </div>
        </div>
      )}

      {mec.prisustva?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Prisustvo</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {mec.prisustva.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: p.status === 'na_cekanju' ? 0.55 : 1 }} title={p.status}>
                <AvatarSvg avatar={p.Korisnik?.avatar} pol={p.Korisnik?.pol} size={26} glow={false} />
                <span style={{ fontSize: 12 }}>{p.Korisnik?.ime}</span>
                <span>{p.status === 'moze' ? '✅' : p.status === 'ne_moze' ? '❌' : '⏳'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="divider" />
      <CommentSection entitetTip="mec" entitetId={mec.id} />
    </div>
  );
}
