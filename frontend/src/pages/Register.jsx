import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const { registracija } = useAuth();
  const navigate = useNavigate();
  const [igre, setIgre] = useState([]);
  const [podaci, setPodaci] = useState({ ime: '', email: '', pol: 'muski', bio: '' });
  const [mojeIgre, setMojeIgre] = useState([{ igra_id: '', pozicija_id: '' }]);
  const [greska, setGreska] = useState('');
  const [poslato, setPoslato] = useState(false);
  const [ucitava, setUcitava] = useState(false);

  useEffect(() => { api.get('/igre').then((res) => setIgre(res.data)); }, []);

  const izmijeniIgru = (idx, polje, vrijednost) => {
    setMojeIgre((niz) => niz.map((r, i) => {
      if (i !== idx) return r;
      const novi = { ...r, [polje]: vrijednost };
      if (polje === 'igra_id') novi.pozicija_id = ''; // promjena igre resetuje poziciju
      return novi;
    }));
  };
  const dodajIgru = () => setMojeIgre((niz) => [...niz, { igra_id: '', pozicija_id: '' }]);
  const ukloniIgru = (idx) => setMojeIgre((niz) => niz.filter((_, i) => i !== idx));

  const posalji = async (e) => {
    e.preventDefault();
    if (ucitava) return; // spriječava duplo slanje ako korisnik klikne više puta dok se čeka odgovor
    setGreska('');
    setUcitava(true);
    try {
      await registracija({ ...podaci, igre: mojeIgre.filter((r) => r.igra_id) });
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
          <label>Igre koje igraš</label>
          {mojeIgre.map((red, idx) => {
            const izabranaIgra = igre.find((i) => i.id === Number(red.igra_id));
            return (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <select style={{ flex: 1 }} value={red.igra_id} onChange={(e) => izmijeniIgru(idx, 'igra_id', e.target.value)}>
                  <option value="">— Izaberite igru —</option>
                  {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
                </select>
                {izabranaIgra?.ima_pozicije && (
                  <select style={{ flex: 1 }} value={red.pozicija_id} onChange={(e) => izmijeniIgru(idx, 'pozicija_id', e.target.value)}>
                    <option value="">Pozicija —</option>
                    {izabranaIgra.Pozicijas?.map((p) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
                  </select>
                )}
                {mojeIgre.length > 1 && (
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => ukloniIgru(idx)} title="Ukloni igru">✕</button>
                )}
              </div>
            );
          })}
          <button type="button" className="btn btn-sm btn-outline" onClick={dodajIgru}>+ Dodaj igru</button>
        </div>
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
