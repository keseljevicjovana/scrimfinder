import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { prijava } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [lozinka, setLozinka] = useState('');
  const [greska, setGreska] = useState('');

  const posalji = async (e) => {
    e.preventDefault();
    setGreska('');
    try {
      const ulogovaniKorisnik = await prijava(email, lozinka);
      if (ulogovaniKorisnik.mora_promijeniti_lozinku) {
        navigate('/moj-profil?prva-prijava=1');
      } else {
        navigate('/');
      }
    } catch (err) {
      setGreska(err.response?.data?.poruka || 'Greška prilikom prijave.');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 60 }}>
      <h1>Prijava</h1>
      <form onSubmit={posalji} className="card">
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Lozinka</label>
          <input type="password" value={lozinka} onChange={(e) => setLozinka(e.target.value)} required />
        </div>
        {greska && <p className="error-text">{greska}</p>}
        <button className="btn" type="submit" style={{ width: '100%' }}>Prijavi se</button>
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Prva prijava? Koristite jednokratnu lozinku poslatu na email.
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          Nemate nalog? <Link to="/registracija">Registrujte se</Link>
        </p>
      </form>
    </div>
  );
}
