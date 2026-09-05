import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const { registracija } = useAuth();
  const navigate = useNavigate();
  const [igre, setIgre] = useState([]);
  const [podaci, setPodaci] = useState({ ime: '', email: '', pol: 'muski', igra_id: '', pozicija_id: '', bio: '' });
  const [greska, setGreska] = useState('');
  const [poslato, setPoslato] = useState(false);
  const [ucitava, setUcitava] = useState(false);

  useEffect(() => { api.get('/igre').then((res) => setIgre(res.data)); }, []);

  const izabranaIgra = igre.find((i) => i.id === Number(podaci.igra_id));

  const posalji = async (e) => {
    e.preventDefault();
    if (ucitava) return; // spriječava duplo slanje ako korisnik klikne više puta dok se čeka odgovor
    setGreska('');
    setUcitava(true);
    try {
      await registracija(podaci);
      setPoslato(true);
    } catch (err) {
      setGreska(err.response?.data?.poruka || 'Greška prilikom registracije.');
    } finally {
      setUcitava(false);
    }
  };

  if (poslato) {
    return (
      <div className="container" style={{ maxWidth: 460, marginTop: 60 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h1>Provjerite email</h1>
          <p>
            Poslali smo jednokratnu lozinku na adresu <strong>{podaci.email}</strong>.
            Prijavite se sa njom, a odmah nakon prijave bićete preusmjereni na stranicu
            <strong> Moj profil</strong> gdje ćete postaviti trajnu lozinku.
          </p>
          <button className="btn" onClick={() => navigate('/prijava')}>Idi na prijavu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 460, marginTop: 40, marginBottom: 40 }}>
      <h1>Registracija</h1>
      <form onSubmit={posalji} className="card">
        <div className="field">
          <label>Ime i prezime</label>
          <input value={podaci.ime} onChange={(e) => setPodaci({ ...podaci, ime: e.target.value })} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={podaci.email} onChange={(e) => setPodaci({ ...podaci, email: e.target.value })} required />
        </div>
        <div className="field">
          <label>Pol (za dodjelu podrazumijevanog avatara)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className={`btn btn-sm ${podaci.pol === 'muski' ? '' : 'btn-outline'}`} onClick={() => setPodaci({ ...podaci, pol: 'muski' })}>Muški</button>
            <button type="button" className={`btn btn-sm ${podaci.pol === 'zenski' ? '' : 'btn-outline'}`} onClick={() => setPodaci({ ...podaci, pol: 'zenski' })}>Ženski</button>
          </div>
        </div>
        <div className="field">
          <label>Primarna igra</label>
          <select value={podaci.igra_id} onChange={(e) => setPodaci({ ...podaci, igra_id: e.target.value, pozicija_id: '' })}>
            <option value="">— Izaberite igru —</option>
            {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
          </select>
        </div>
        {izabranaIgra?.ima_pozicije && (
          <div className="field">
            <label>Pozicija</label>
            <select value={podaci.pozicija_id} onChange={(e) => setPodaci({ ...podaci, pozicija_id: e.target.value })}>
              <option value="">—</option>
              {izabranaIgra.Pozicijas?.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>Bio</label>
          <textarea rows={3} value={podaci.bio} onChange={(e) => setPodaci({ ...podaci, bio: e.target.value })} />
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          Rank se ne bira ručno — svaki tim ima svoj rank, automatski izračunat iz odigranih mečeva.
        </p>
        <p className="muted" style={{ fontSize: 12 }}>
          Lozinku ne birate sami — jednokratna lozinka će biti poslata na vaš email nakon registracije.
        </p>
        {greska && <p className="error-text">{greska}</p>}
        <button className="btn" type="submit" disabled={ucitava} style={{ width: '100%', opacity: ucitava ? 0.6 : 1 }}>
          {ucitava ? 'Šalje se... (može potrajati do minut)' : 'Kreiraj nalog'}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          Već imate nalog? <Link to="/prijava">Prijavite se</Link>
        </p>
      </form>
    </div>
  );
}
