import { useState } from 'react';
import api from '../api/axios';
import GrbSvg, { OBLICI, SIMBOLI, POZADINE, SIMBOL_BOJE } from './GrbSvg';

function Paleta({ label, opcije, vrijednost, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {opcije.map((boja) => (
          <button
            type="button" key={boja} onClick={() => onChange(boja)} title={boja}
            style={{
              width: 28, height: 28, borderRadius: '50%', background: boja, cursor: 'pointer',
              border: vrijednost === boja ? '3px solid var(--neon-cyan)' : '2px solid var(--border)',
              boxShadow: vrijednost === boja ? '0 0 8px var(--neon-cyan)' : 'none',
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

export default function GrbEditor({ timId, pocetniGrb, onSacuvano }) {
  const [grb, setGrb] = useState(pocetniGrb || { oblik: 'stit', pozadina: POZADINE[0], simbol: 'zmaj', simbolBoja: SIMBOL_BOJE[0] });
  const [poruka, setPoruka] = useState('');

  const izmijeni = (polje, vrijednost) => setGrb((g) => ({ ...g, [polje]: vrijednost }));

  const sacuvaj = async () => {
    const res = await api.put(`/timovi/${timId}/grb`, { grb });
    setPoruka('Grb je sačuvan.');
    if (onSacuvano) onSacuvano(res.data.grb);
    setTimeout(() => setPoruka(''), 2500);
  };

  return (
    <div className="grid grid-2">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <GrbSvg grb={grb} size={160} />
          <p className="muted" style={{ marginTop: 8 }}>Pregled uživo</p>
        </div>
      </div>
      <div>
        <IzborDugmad label="Oblik" opcije={OBLICI} vrijednost={grb.oblik} onChange={(v) => izmijeni('oblik', v)} />
        <Paleta label="Boja pozadine" opcije={POZADINE} vrijednost={grb.pozadina} onChange={(v) => izmijeni('pozadina', v)} />
        <IzborDugmad label="Simbol" opcije={SIMBOLI} vrijednost={grb.simbol} onChange={(v) => izmijeni('simbol', v)} />
        <Paleta label="Boja simbola" opcije={SIMBOL_BOJE} vrijednost={grb.simbolBoja} onChange={(v) => izmijeni('simbolBoja', v)} />
        <button className="btn" onClick={sacuvaj} style={{ marginTop: 10 }}>Sačuvaj grb</button>
        {poruka && <p className="muted" style={{ color: 'var(--neon-green)', marginTop: 8 }}>{poruka}</p>}
      </div>
    </div>
  );
}
