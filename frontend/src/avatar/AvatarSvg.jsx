import { nadjiHex } from './avatarOptions';
import { KOZA, OCI, BOJA_KOSE, ODJECA } from './avatarOptions';

// Iscrtava stilizovan "esports" avatar — oštri, uglasti oblici (maska/vizir estetika),
// umjesto mekih krugova — u duhu ozbiljne gejmerske/takmičarske identifikacije, ne dječje ikonice.

function Kosa({ frizura, boja }) {
  switch (frizura) {
    case 'celav':
      return (
        <path d="M29 26 Q50 12 71 26" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.12" strokeLinecap="round" />
      );
    case 'kratka':
      return (
        <path d="M27 32 C27 16 37 8 50 8 C63 8 73 16 73 32 C65 25 58 21 50 21 C42 21 35 25 27 32 Z" fill={boja} />
      );
    case 'iroki':
      return (
        <>
          <path d="M27 32 C27 17 36 9 50 9 C64 9 73 17 73 32 C67 27 61 24 55 23 L58 25 L50 24 L42 25 L45 23 C39 24 33 27 27 32 Z" fill={boja} />
          <polygon points="50,0 56,3 53,20 47,20 44,3" fill={boja} />
        </>
      );
    case 'mohawk':
      return (
        <polygon points="50,-3 56,4 53,16 50,30 47,16 44,4" fill={boja} />
      );
    case 'kovrdzava':
      return (
        <g fill={boja}>
          <circle cx="30" cy="28" r="7" />
          <circle cx="38" cy="16" r="8" />
          <circle cx="50" cy="11" r="8.5" />
          <circle cx="62" cy="16" r="8" />
          <circle cx="70" cy="28" r="7" />
        </g>
      );
    case 'kratki_bob':
      return (
        <path d="M25 36 C24 16 35 6 50 6 C65 6 76 16 75 36 L70 30 L69 22 C64 14 57 10 50 10 C43 10 36 14 31 22 L30 30 Z" fill={boja} />
      );
    case 'rep':
      return (
        <>
          <path d="M27 32 C27 16 37 8 50 8 C63 8 73 16 73 32 C65 25 58 21 50 21 C42 21 35 25 27 32 Z" fill={boja} />
          <path d="M69 24 Q84 30 80 50 Q77 42 71 38 Z" fill={boja} />
        </>
      );
    case 'pundza':
      return (
        <>
          <path d="M27 32 C27 16 37 8 50 8 C63 8 73 16 73 32 C65 25 58 21 50 21 C42 21 35 25 27 32 Z" fill={boja} />
          <circle cx="50" cy="6" r="7" fill={boja} />
        </>
      );
    case 'dugacka_ravna':
    default:
      return (
        <path
          d="M27 32 C27 15 36 7 50 7 C64 7 73 15 73 32 L75 58 L68 50 L67 30 C62 21 56 18 50 18 C44 18 38 21 33 30 L32 50 L25 58 Z"
          fill={boja}
        />
      );
  }
}

function Dodatak({ dodatak, ociHex }) {
  switch (dodatak) {
    case 'naocare':
      return (
        <g>
          <polygon points="28,42 48,40 48,50 30,52" fill="#0d0f18" stroke="#00f0ff" strokeWidth="1.6" />
          <polygon points="52,40 72,42 70,52 52,50" fill="#0d0f18" stroke="#00f0ff" strokeWidth="1.6" />
          <line x1="48" y1="43" x2="52" y2="43" stroke="#00f0ff" strokeWidth="1.6" />
        </g>
      );
    case 'slusalice':
      return (
        <g>
          <path d="M18 38 Q50 2 82 38" stroke="#ff2ec4" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <rect x="11" y="34" width="10" height="20" rx="3" fill="#1a1a26" stroke="#ff2ec4" strokeWidth="2" />
          <rect x="79" y="34" width="10" height="20" rx="3" fill="#1a1a26" stroke="#ff2ec4" strokeWidth="2" />
          <path d="M84 52 Q88 62 76 66 L74 63 Q84 60 81 52 Z" fill="#ff2ec4" />
        </g>
      );
    case 'vr_naocare':
      return (
        <g>
          <rect x="24" y="36" width="52" height="18" rx="4" fill="#0d0f18" stroke="#b23bff" strokeWidth="2" />
          <rect x="30" y="41" width="16" height="8" rx="2" fill="#b23bff" opacity="0.85" />
          <rect x="54" y="41" width="16" height="8" rx="2" fill="#b23bff" opacity="0.85" />
        </g>
      );
    case 'vizir':
      return (
        <g>
          <path d="M24 38 L76 38 L74 50 Q50 58 26 50 Z" fill="#0d0f18" opacity="0.92" />
          <path d="M26 40 L74 40 L72 46 Q50 51 28 46 Z" fill={ociHex} opacity="0.55" />
          <line x1="24" y1="38" x2="76" y2="38" stroke={ociHex} strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

export default function AvatarSvg({ avatar, pol, size = 96, glow = true }) {
  const cfg = avatar || {};
  const kozaHex = nadjiHex(KOZA, cfg.koza) || '#e0ac69';
  const ociHex = nadjiHex(OCI, cfg.oci) || '#4aa8ff';
  const kosaHex = nadjiHex(BOJA_KOSE, cfg.boja_kose) || '#1a1a1a';
  const odjecaHex = nadjiHex(ODJECA, cfg.odjeca) || '#1c1c26';
  const uid = [cfg.koza, cfg.oci, cfg.boja_kose, cfg.odjeca, cfg.frizura, cfg.dodatak]
    .map((v) => v || 'x').join('-').replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <svg
      width={size} height={size} viewBox="0 0 100 120"
      style={glow ? { filter: `drop-shadow(0 0 6px ${ociHex}44)` } : undefined}
    >
      <defs>
        <linearGradient id={`jak-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={odjecaHex} stopOpacity="1" />
          <stop offset="100%" stopColor="#0a0a10" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* ramena / jakna — meko zaobljena, prijateljski oblik */}
      <path
        d="M12 120 Q16 82 50 78 Q84 82 88 120 Z"
        fill={`url(#jak-${uid})`}
      />
      <path d="M50 78 Q50 92 46 120 M50 78 Q50 92 54 120" stroke={ociHex} strokeWidth="1" opacity="0.3" fill="none" />
      <path d="M38 82 Q50 90 62 82 L62 88 Q50 96 38 88 Z" fill={ociHex} opacity="0.35" />

      {/* vrat */}
      <path d="M43 66 L57 66 L57 80 Q50 84 43 80 Z" fill={kozaHex} />

      {/* glava — meko zaobljena, ljudska silueta (ne uglasta, ne heksagon) */}
      <path
        d="M50 10 C 65 10 73 23 73 39 C 73 57 63 71 50 75 C 37 71 27 57 27 39 C 27 23 35 10 50 10 Z"
        fill={kozaHex}
      />
      {/* blaga sjenka na vilici radi definicije, bez agresivnog reza */}
      <path d="M38 64 Q50 72 62 64 Q58 70 50 72 Q42 70 38 64 Z" fill="#000000" opacity="0.06" />
      {/* blage sjenke uz obraze radi 3D utiska */}
      <ellipse cx="33" cy="42" rx="4" ry="7" fill="#000000" opacity="0.05" />
      <ellipse cx="67" cy="42" rx="4" ry="7" fill="#000000" opacity="0.05" />

      {/* uši */}
      <ellipse cx="26.5" cy="42" rx="2.6" ry="4" fill={kozaHex} />
      <ellipse cx="73.5" cy="42" rx="2.6" ry="4" fill={kozaHex} />

      {/* oči — normalne, tople: bjeloočnica + šarenica u boji + zenica + sjaj */}
      <ellipse cx="40" cy="43" rx="6.2" ry="4.4" fill="#ffffff" />
      <ellipse cx="60" cy="43" rx="6.2" ry="4.4" fill="#ffffff" />
      <circle cx="40" cy="43.5" r="3.1" fill={ociHex} />
      <circle cx="60" cy="43.5" r="3.1" fill={ociHex} />
      <circle cx="40" cy="43.5" r="1.4" fill="#161018" />
      <circle cx="60" cy="43.5" r="1.4" fill="#161018" />
      <circle cx="38.7" cy="42.1" r="0.8" fill="#ffffff" />
      <circle cx="58.7" cy="42.1" r="0.8" fill="#ffffff" />

      {/* obrve — blago zakrivljene, prijateljski/fokusiran izraz */}
      <path d="M33 36.5 Q40 33.5 47 36" stroke="#00000060" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M53 36 Q60 33.5 67 36.5" stroke="#00000060" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* nos — suptilan, samo mala naznaka */}
      <path d="M49 46 Q47.5 51 49.5 52.5 L51 52.5" stroke="#00000030" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* usta — blag, prijateljski osmijeh */}
      <path d="M42 60 Q50 65 58 60" stroke="#00000055" strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* kosa */}
      <Kosa frizura={cfg.frizura} boja={kosaHex} />
      {/* dodatak */}
      <Dodatak dodatak={cfg.dodatak} ociHex={ociHex} />
    </svg>
  );
}
