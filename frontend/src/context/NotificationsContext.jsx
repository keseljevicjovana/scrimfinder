import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

// Dijeljeno stanje broja nepročitanih notifikacija — i Navbar (bedž) i stranica Notifikacije
// koriste ISTI izvor, tako da se bedž ODMAH osvježi čim se nešto označi pročitanim,
// umjesto da Navbar ostane "zaglavljen" na starom broju dok se ručno ne osvježi stranica.
const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { korisnik } = useAuth();
  const [nepr, setNepr] = useState(0);

  const osvjezi = useCallback(() => {
    if (!korisnik) { setNepr(0); return; }
    api.get('/notifikacije').then((res) => {
      setNepr(res.data.filter((n) => !n.procitano).length);
    }).catch(() => {});
  }, [korisnik]);

  useEffect(() => {
    osvjezi();
    const t = setInterval(osvjezi, 15000);
    return () => clearInterval(t);
  }, [osvjezi]);

  return (
    <NotificationsContext.Provider value={{ nepr, osvjezi }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
