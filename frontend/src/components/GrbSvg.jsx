// Iscrtava generisan "grb" tima — oblik + pozadinska boja + simbol u akcentnoj boji,
// analogno sistemu avatara igrača, samo za identitet TIMA umjesto pojedinca.

export const OBLICI = [
  { id: 'stit', naziv: 'Štit' },
  { id: 'heksagon', naziv: 'Heksagon' },
  { id: 'dijamant', naziv: 'Dijamant' },
  { id: 'krug', naziv: 'Krug' },
];

export const SIMBOLI = [
  { id: 'zmaj', naziv: 'Zmaj' },
  { id: 'lobanja', naziv: 'Lobanja' },
  { id: 'plamen', naziv: 'Plamen' },
  { id: 'zvijezda', naziv: 'Zvijezda' },
  { id: 'grom', naziv: 'Grom' },
  { id: 'macka', naziv: 'Mačka grabljivica' },
  { id: 'kandza', naziv: 'Kandža' },
];

export const POZADINE = ['#1a1330', '#0d0f18', '#241a3d', '#122018', '#2a1418', '#14202a'];
export const SIMBOL_BOJE = ['#00f0ff', '#ff2ec4', '#b23bff', '#ffe14d', '#39ff9e', '#ff8a3d'];

function Oblik({ oblik, boja, children }) {
  switch (oblik) {
    case 'heksagon':
      return (
        <g>
          <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill={boja} />
          {children}
        </g>
      );
    case 'dijamant':
      return (
        <g>
          <polygon points="50,2 88,50 50,98 12,50" fill={boja} />
          {children}
        </g>
      );
    case 'krug':
      return (
        <g>
          <circle cx="50" cy="50" r="46" fill={boja} />
          {children}
        </g>
      );
    case 'stit':
    default:
      return (
        <g>
          <path d="M50 2 L88 14 L88 52 Q88 82 50 98 Q12 82 12 52 L12 14 Z" fill={boja} />
          {children}
        </g>
      );
  }
}

function Simbol({ simbol, boja }) {
  switch (simbol) {
    case 'lobanja':
      return (
        <g fill={boja}>
          <circle cx="50" cy="42" r="20" />
          <rect x="38" y="55" width="24" height="12" rx="3" />
          <circle cx="42" cy="40" r="5" fill="#000" opacity="0.5" />
          <circle cx="58" cy="40" r="5" fill="#000" opacity="0.5" />
        </g>
      );
    case 'plamen':
      return (
        <path
          d="M50 20 C40 35 32 42 32 56 C32 70 40 78 50 78 C60 78 68 70 68 56 C68 46 62 42 58 32 C58 42 52 44 50 38 C48 30 52 26 50 20 Z"
          fill={boja}
        />
      );
    case 'zvijezda':
      return (
        <polygon
          points="50,18 58,42 84,42 63,57 71,81 50,66 29,81 37,57 16,42 42,42"
          fill={boja}
        />
      );
    case 'grom':
      return <polygon points="55,16 32,54 47,54 42,84 70,44 54,44" fill={boja} />;
    case 'macka':
      return (
        <g fill={boja}>
          <polygon points="35,30 45,15 50,32" />
          <polygon points="65,30 55,15 50,32" />
          <circle cx="50" cy="48" r="22" />
          <polygon points="30,50 20,58 32,58" />
          <polygon points="70,50 80,58 68,58" />
        </g>
      );
    case 'kandza':
      return (
        <g stroke={boja} strokeWidth="7" fill="none" strokeLinecap="round">
          <path d="M28 24 L40 76" />
          <path d="M50 20 L52 78" />
          <path d="M72 24 L60 76" />
        </g>
      );
    case 'zmaj':
    default:
      return (
        <path
          d="M28 62 Q22 40 38 30 Q34 24 40 20 Q46 26 46 30 Q56 24 66 30 Q72 24 78 28 Q74 36 68 38 Q76 46 72 58 Q66 50 58 50 Q62 60 56 68 Q54 58 46 56 Q48 66 40 70 Q40 60 34 56 Q32 64 28 62 Z"
          fill={boja}
        />
      );
  }
}

export default function GrbSvg({ grb, size = 64 }) {
  if (!grb) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <Oblik oblik={grb.oblik} boja={grb.pozadina || '#1a1330'}>
        <Simbol simbol={grb.simbol} boja={grb.simbolBoja || '#00f0ff'} />
      </Oblik>
    </svg>
  );
}
