import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, samoAdmin = false }) {
  const { korisnik, ucitava } = useAuth();
  if (ucitava) return <div className="container"><p className="muted">Učitavanje...</p></div>;
  if (!korisnik) return <Navigate to="/prijava" />;
  if (samoAdmin && korisnik.uloga !== 'admin') return <Navigate to="/" />;
  return children;
}
