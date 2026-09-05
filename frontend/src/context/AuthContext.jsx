import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [korisnik, setKorisnik] = useState(null);
  const [ucitava, setUcitava] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setUcitava(false); return; }
    api.get('/auth/ja')
      .then((res) => setKorisnik(res.data.korisnik))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setUcitava(false));
  }, []);

  // Prijava: email + lozinka (jednokratna ili trajna — nema razlike na nivou API-ja).
  const prijava = async (email, lozinka) => {
    const res = await api.post('/auth/prijava', { email, lozinka });
    localStorage.setItem('token', res.data.token);
    setKorisnik(res.data.korisnik);
    return res.data.korisnik;
  };

  // Registracija: NE prijavljuje korisnika automatski — jednokratna lozinka se šalje na email,
  // a korisnik se prvi put prijavljuje ručno sa njom.
  const registracija = async (podaci) => {
    const res = await api.post('/auth/registracija', podaci);
    return res.data;
  };

  const odjava = () => {
    localStorage.removeItem('token');
    setKorisnik(null);
  };

  // Lokalno ažurira polja trenutnog korisnika (npr. nakon izmjene avatara ili lozinke)
  // bez potrebe za ponovnim dohvatanjem cijelog profila.
  const osvjeziKorisnika = (izmjene) => setKorisnik((k) => (k ? { ...k, ...izmjene } : k));

  return (
    <AuthContext.Provider value={{ korisnik, ucitava, prijava, registracija, odjava, osvjeziKorisnika }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
