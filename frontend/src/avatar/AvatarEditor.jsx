import { useState } from 'react';
import AvatarSvg from './AvatarSvg';
import { KOZA, OCI, BOJA_KOSE, FRIZURE, ODJECA, DODATAK } from './avatarOptions';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Paleta({ label, opcije, vrijednost, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {opcije.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => onChange(o.id)}
            title={o.naziv}
            style={{
              width: 30, height: 30, borderRadius: '50%', background: o.hex,
              border: vrijednost === o.id ? '3px solid var(--neon-cyan)' : '2px solid var(--border)',
              cursor: 'pointer', boxShadow: vrijednost === o.id ? '0 0 8px var(--neon-cyan)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function IzborDugmad({ label, opcije, vrijednost, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {opcije.map((o) => (
          <button
            type="button" key={o.id} className={`btn btn-sm ${vrijednost === o.id ? '' : 'btn-outline'}`}
            onClick={() => onChange(o.id)}
          >
            {o.naziv}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AvatarEditor({ pol, pocetniAvatar, onSacuvano }) {
  const { korisnik, osvjeziKorisnika } = useAuth();
  const [avatar, setAvatar] = useState(pocetniAvatar || {});
  const [poruka, setPoruka] = useState('');
  const frizure = FRIZURE[pol] || FRIZURE.muski;

  const izmijeni = (polje, vrijednost) => setAvatar((a) => ({ ...a, [polje]: vrijednost }));

  const sacuvaj = async () => {
    const res = await api.put('/korisnici/avatar', avatar);
    setPoruka('Avatar je sačuvan.');
    if (osvjeziKorisnika) osvjeziKorisnika({ avatar: res.data.avatar });
    if (onSacuvano) onSacuvano(res.data.avatar);
    setTimeout(() => setPoruka(''), 2500);
  };

  return (
    <div className="grid grid-2">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <AvatarSvg avatar={avatar} pol={pol} size={180} />
          <p className="muted" style={{ marginTop: 8 }}>Pregled uživo</p>
        </div>
      </div>
      <div>
        <Paleta label="Boja kože" opcije={KOZA} vrijednost={avatar.koza} onChange={(v) => izmijeni('koza', v)} />
        <Paleta label="Boja očiju" opcije={OCI} vrijednost={avatar.oci} onChange={(v) => izmijeni('oci', v)} />
        <Paleta label="Boja kose" opcije={BOJA_KOSE} vrijednost={avatar.boja_kose} onChange={(v) => izmijeni('boja_kose', v)} />
        <IzborDugmad label="Frizura" opcije={frizure} vrijednost={avatar.frizura} onChange={(v) => izmijeni('frizura', v)} />
        <Paleta label="Odjeća" opcije={ODJECA} vrijednost={avatar.odjeca} onChange={(v) => izmijeni('odjeca', v)} />
        <IzborDugmad label="Dodatak" opcije={DODATAK} vrijednost={avatar.dodatak || 'nista'} onChange={(v) => izmijeni('dodatak', v)} />
        <button className="btn" onClick={sacuvaj} style={{ marginTop: 10 }}>Sačuvaj avatar</button>
        {poruka && <p className="muted" style={{ color: 'var(--neon-green)', marginTop: 8 }}>{poruka}</p>}
      </div>
    </div>
  );
}
