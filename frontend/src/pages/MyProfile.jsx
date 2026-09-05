import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AvatarEditor from '../avatar/AvatarEditor';
import AvatarSvg from '../avatar/AvatarSvg';

const DANI = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];

export default function MyProfile() {
  const { korisnik, osvjeziKorisnika } = useAuth();
  const [searchParams] = useSearchParams();
  const prvaPrijava = searchParams.get('prva-prijava') === '1' || korisnik?.mora_promijeniti_lozinku;

  const [profil, setProfil] = useState(null);
  const [igre, setIgre] = useState([]);
  const [ime, setIme] = useState(korisnik?.ime || '');
  const [lozinkaForm, setLozinkaForm] = useState({ staraLozinka: '', novaLozinka: '', potvrdaNoveLozinke: '' });
  const [lozinkaPoruka, setLozinkaPoruka] = useState('');
  const [lozinkaGreska, setLozinkaGreska] = useState('');

  // Dostupnost — svaki dan ima checkbox (aktivan/neaktivan) + od/do vrijeme.
  const [dostupnost, setDostupnost] = useState(DANI.map((_, i) => ({ dan_u_sedmici: i, aktivno: false, vrijeme_od: '19:00', vrijeme_do: '23:00' })));
  const [dostupnostPoruka, setDostupnostPoruka] = useState('');

  useEffect(() => {
    if (korisnik.uloga === 'admin') return; // admin nema profil igrača/dostupnost — nema smisla za njegovu ulogu
    api.get('/igre').then((res) => setIgre(res.data));
    api.get('/auth/ja').then((res) => setProfil(res.data.profil));
    api.get(`/korisnici/${korisnik.id}`).then((res) => {
      const postojeca = res.data.dostupnost || [];
      if (postojeca.length > 0) {
        setDostupnost(DANI.map((_, i) => {
          const postoji = postojeca.find((d) => d.dan_u_sedmici === i);
          return postoji
            ? { dan_u_sedmici: i, aktivno: true, vrijeme_od: postoji.vrijeme_od.slice(0, 5), vrijeme_do: postoji.vrijeme_do.slice(0, 5) }
            : { dan_u_sedmici: i, aktivno: false, vrijeme_od: '19:00', vrijeme_do: '23:00' };
        }));
      }
    });
  }, [korisnik.id, korisnik.uloga]);

  const sacuvajLozinku = async (e) => {
    e.preventDefault();
    setLozinkaGreska(''); setLozinkaPoruka('');
    try {
      await api.put('/korisnici/lozinka', lozinkaForm);
      setLozinkaPoruka('Lozinka je uspješno promijenjena.');
      setLozinkaForm({ staraLozinka: '', novaLozinka: '', potvrdaNoveLozinke: '' });
      osvjeziKorisnika({ mora_promijeniti_lozinku: false });
    } catch (err) {
      setLozinkaGreska(err.response?.data?.poruka || 'Greška prilikom promjene lozinke.');
    }
  };

  const sacuvajProfil = async (e) => {
    e.preventDefault();
    await api.put('/korisnici/profil', { ime, ...profil });
    alert('Profil je ažuriran.');
  };

  const izmijeniDan = (i, polje, vrijednost) => {
    setDostupnost((d) => d.map((x, idx) => (idx === i ? { ...x, [polje]: vrijednost } : x)));
  };

  const sacuvajDostupnost = async () => {
    const termini = dostupnost.filter((d) => d.aktivno).map((d) => ({
      dan_u_sedmici: d.dan_u_sedmici, vrijeme_od: `${d.vrijeme_od}:00`, vrijeme_do: `${d.vrijeme_do}:00`,
    }));
    await api.put('/korisnici/dostupnost', { termini });
    setDostupnostPoruka('Dostupnost je sačuvana.');
    setTimeout(() => setDostupnostPoruka(''), 2500);
  };

  if (!korisnik) return null;

  if (korisnik.uloga === 'admin') {
    return (
      <div className="container" style={{ marginTop: 30, marginBottom: 40, maxWidth: 480 }}>
        <h1>Nalog administratora</h1>
        <p className="muted">Administrator nema profil igrača, tim, ni avatar — samo pristup <Link to="/admin">admin panelu</Link>. Ovdje možeš samo da promijeniš lozinku.</p>
        <div className="card">
          <strong>{korisnik.ime}</strong>
          <p className="muted" style={{ margin: 0 }}>{korisnik.email}</p>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Promjena lozinke</h3>
          <form onSubmit={sacuvajLozinku}>
            <div className="field">
              <label>Trenutna lozinka</label>
              <input type="password" value={lozinkaForm.staraLozinka} onChange={(e) => setLozinkaForm({ ...lozinkaForm, staraLozinka: e.target.value })} required />
            </div>
            <div className="field">
              <label>Nova lozinka</label>
              <input type="password" minLength={6} value={lozinkaForm.novaLozinka} onChange={(e) => setLozinkaForm({ ...lozinkaForm, novaLozinka: e.target.value })} required />
            </div>
            <div className="field">
              <label>Potvrdite novu lozinku</label>
              <input type="password" minLength={6} value={lozinkaForm.potvrdaNoveLozinke} onChange={(e) => setLozinkaForm({ ...lozinkaForm, potvrdaNoveLozinke: e.target.value })} required />
            </div>
            {lozinkaGreska && <p className="error-text">{lozinkaGreska}</p>}
            {lozinkaPoruka && <p className="muted" style={{ color: 'var(--neon-green)' }}>{lozinkaPoruka}</p>}
            <button className="btn" type="submit">Promijeni lozinku</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ marginTop: 30, marginBottom: 40 }}>
      <h1>Moj profil</h1>

      {prvaPrijava && (
        <div className="card" style={{ border: '1px solid var(--warn)', marginBottom: 20 }}>
          <h3 style={{ color: 'var(--warn)' }}>Potrebno je da postavite trajnu lozinku</h3>
          <p className="muted">Prijavili ste se jednokratnom lozinkom iz emaila. Postavite novu, trajnu lozinku ispod da biste nastavili da koristite platformu.</p>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AvatarSvg avatar={korisnik.avatar} pol={korisnik.pol} size={64} />
            <div>
              <strong>{korisnik.ime}</strong>
              <p className="muted" style={{ margin: 0 }}>{korisnik.email}</p>
            </div>
          </div>
          <div className="divider" />
          <form onSubmit={sacuvajProfil}>
            <div className="field">
              <label>Ime i prezime</label>
              <input value={ime} onChange={(e) => setIme(e.target.value)} />
            </div>
            {profil && (
              <>
                <div className="field">
                  <label>Omiljena igra</label>
                  <select value={profil.igra_id || ''} onChange={(e) => setProfil({ ...profil, igra_id: e.target.value })}>
                    {igre.map((i) => <option key={i.id} value={i.id}>{i.naziv}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Bio</label>
                  <textarea rows={3} value={profil.bio || ''} onChange={(e) => setProfil({ ...profil, bio: e.target.value })} />
                </div>
                <p className="muted" style={{ fontSize: 12 }}>Napomena: rank se više ne bira ručno — prikazuje se rank tvog TIMA, izračunat automatski iz odigranih mečeva.</p>
              </>
            )}
            <button className="btn" type="submit">Sačuvaj izmjene</button>
          </form>
        </div>

        <div className="card" style={prvaPrijava ? { border: '1px solid var(--warn)' } : undefined}>
          <h3>Promjena lozinke</h3>
          <form onSubmit={sacuvajLozinku}>
            <div className="field">
              <label>{prvaPrijava ? 'Jednokratna lozinka (iz emaila)' : 'Trenutna lozinka'}</label>
              <input type="password" value={lozinkaForm.staraLozinka} onChange={(e) => setLozinkaForm({ ...lozinkaForm, staraLozinka: e.target.value })} required />
            </div>
            <div className="field">
              <label>Nova lozinka</label>
              <input type="password" minLength={6} value={lozinkaForm.novaLozinka} onChange={(e) => setLozinkaForm({ ...lozinkaForm, novaLozinka: e.target.value })} required />
            </div>
            <div className="field">
              <label>Potvrdite novu lozinku</label>
              <input type="password" minLength={6} value={lozinkaForm.potvrdaNoveLozinke} onChange={(e) => setLozinkaForm({ ...lozinkaForm, potvrdaNoveLozinke: e.target.value })} required />
            </div>
            {lozinkaGreska && <p className="error-text">{lozinkaGreska}</p>}
            {lozinkaPoruka && <p className="muted" style={{ color: 'var(--neon-green)' }}>{lozinkaPoruka}</p>}
            <button className="btn" type="submit">Promijeni lozinku</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Dostupnost</h3>
        <p className="muted" style={{ marginTop: -6 }}>Označi dane kada si obično dostupan/na za skrimove — koristi se u detaljnoj pretrazi timova.</p>
        {dostupnost.map((d, i) => (
          <div key={i} className="dan-red">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={d.aktivno} onChange={(e) => izmijeniDan(i, 'aktivno', e.target.checked)} />
              <span className="dan-naziv">{DANI[i]}</span>
            </label>
            {d.aktivno && (
              <>
                <input type="time" style={{ width: 110 }} value={d.vrijeme_od} onChange={(e) => izmijeniDan(i, 'vrijeme_od', e.target.value)} />
                <span className="muted">—</span>
                <input type="time" style={{ width: 110 }} value={d.vrijeme_do} onChange={(e) => izmijeniDan(i, 'vrijeme_do', e.target.value)} />
              </>
            )}
          </div>
        ))}
        <button className="btn btn-sm" style={{ marginTop: 14 }} onClick={sacuvajDostupnost}>Sačuvaj dostupnost</button>
        {dostupnostPoruka && <span className="muted" style={{ color: 'var(--neon-green)', marginLeft: 10 }}>{dostupnostPoruka}</span>}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Uredi avatar</h3>
        <AvatarEditor pol={korisnik.pol} pocetniAvatar={korisnik.avatar} />
      </div>
    </div>
  );
}
