import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import AvatarSvg from '../avatar/AvatarSvg';

export default function Navbar() {
  const { korisnik, odjava } = useAuth();
  const navigate = useNavigate();
  const { nepr } = useNotifications();

  return (
    <div className="navbar">
      <Link to="/" className="logo">Scrim<span>Finder</span></Link>
      <nav>
        {korisnik?.uloga === 'admin' ? (
          <>
            <Link to="/admin" style={{ fontWeight: 700, color: 'var(--neon-yellow)' }}>⚙ Admin panel</Link>
            <Link to="/notifikacije">Notifikacije{nepr > 0 && <span className="badge-count">{nepr}</span>}</Link>
            <span className="muted" style={{ textTransform: 'none', fontSize: 13 }}>{korisnik.ime}</span>
            <button onClick={() => { odjava(); navigate('/'); }}>Odjava</button>
          </>
        ) : (
          <>
            <Link to="/pretraga">Pretraga</Link>
            <Link to="/rangiranje">Rangiranje</Link>
            <Link to="/turniri">Turniri</Link>
            {korisnik && (
              <>
                <Link to="/moji-timovi">Moji timovi</Link>
                <Link to="/kalendar">Kalendar</Link>
                <Link to="/scrim-zahtjevi">Scrim zahtjevi</Link>
                <Link to="/notifikacije">Notifikacije{nepr > 0 && <span className="badge-count">{nepr}</span>}</Link>
                <Link to="/moj-profil" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AvatarSvg avatar={korisnik.avatar} pol={korisnik.pol} size={28} glow={false} />
                  {korisnik.ime}
                </Link>
                <button onClick={() => { odjava(); navigate('/'); }}>Odjava</button>
              </>
            )}
            {!korisnik && (
              <>
                <Link to="/prijava">Prijava</Link>
                <Link to="/registracija">Registracija</Link>
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
