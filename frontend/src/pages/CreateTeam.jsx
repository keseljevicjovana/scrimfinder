import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function CreateTeam() {
  const navigate = useNavigate();
  const [igre, setIgre] = useState([]);
  const [podaci, setPodaci] = useState({ naziv: '', igra_id: '', opis: '', logo_url: '' });
  const [greska, setGreska] = useState('');

  useEffect(() => { api.get('/igre').then((res) => setIgre(res.data)); }, []);

  const posalji = async (e) => {
    e.preventDefault();
    setGreska('');
    try {
      const res = await api.post('/timovi', podaci);
      navigate(`/tim/${res.data.id}`);
    } catch (err) {
      setGreska(err.response?.data?.poruka || 'Greška prilikom kreiranja tima.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 480, marginTop: 30 }}>
      <h1>Novi tim</h1>
      <form onSubmit={posalji} className="card">
        <div className="field">
          <label>Naziv tima</label>
          <input value={podaci.naziv} onChange={(e) => setPodaci({ ...podaci, naziv: e.target.value })} required />
        </div>
        <div className="field">
          <label>Igra</label>
          <select value={podaci.igra_id} onChange={(e) => setPodaci({ ...podaci, igra_id: e.target.value })} required>
            <option value="">— Izaberite igru —</option>
            {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Opis</label>
          <textarea rows={3} value={podaci.opis} onChange={(e) => setPodaci({ ...podaci, opis: e.target.value })} />
        </div>
        <div className="field">
          <label>URL logotipa (opciono)</label>
          <input value={podaci.logo_url} onChange={(e) => setPodaci({ ...podaci, logo_url: e.target.value })} />
        </div>
        {greska && <p className="error-text">{greska}</p>}
        <button className="btn" type="submit">Kreiraj tim</button>
      </form>
    </div>
  );
}
