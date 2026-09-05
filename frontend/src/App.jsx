import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import ChatWidget from './components/ChatWidget';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import PlayerProfile from './pages/PlayerProfile';
import TeamProfile from './pages/TeamProfile';
import MojiTimovi from './pages/MojiTimovi';
import Kalendar from './pages/Kalendar';
import ScrimRequests from './pages/ScrimRequests';
import MatchDetail from './pages/MatchDetail';
import Notifications from './pages/Notifications';
import Leaderboard from './pages/Leaderboard';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import AdminDashboard from './pages/AdminDashboard';
import MyProfile from './pages/MyProfile';

// Ako se korisnik prijavio jednokratnom lozinkom (mora_promijeniti_lozinku),
// zaključavamo cijelu aplikaciju na stranicu "Moj profil" dok ne postavi trajnu lozinku.
function ZakljucajDokNePromijeniLozinku({ children }) {
  const { korisnik } = useAuth();
  const location = useLocation();
  if (korisnik?.mora_promijeniti_lozinku && location.pathname !== '/moj-profil') {
    return <Navigate to="/moj-profil?prva-prijava=1" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ZakljucajDokNePromijeniLozinku>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/prijava" element={<Login />} />
        <Route path="/registracija" element={<Register />} />
        <Route path="/pretraga" element={<Search />} />
        <Route path="/rangiranje" element={<Leaderboard />} />
        <Route path="/turniri" element={<Tournaments />} />
        <Route path="/turnir/:id" element={<TournamentDetail />} />
        <Route path="/igrac/:id" element={<PlayerProfile />} />
        <Route path="/tim/:id" element={<TeamProfile />} />
        <Route path="/mec/:id" element={<MatchDetail />} />
        <Route path="/moji-timovi" element={<PrivateRoute><MojiTimovi /></PrivateRoute>} />
        <Route path="/kalendar" element={<PrivateRoute><Kalendar /></PrivateRoute>} />
        <Route path="/scrim-zahtjevi" element={<PrivateRoute><ScrimRequests /></PrivateRoute>} />
        <Route path="/notifikacije" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/moj-profil" element={<PrivateRoute><MyProfile /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute samoAdmin><AdminDashboard /></PrivateRoute>} />
      </Routes>
      <ChatWidget />
    </ZakljucajDokNePromijeniLozinku>
  );
}
