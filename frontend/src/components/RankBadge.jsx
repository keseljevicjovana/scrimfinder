export default function RankBadge({ rank }) {
  if (!rank) return null;
  return <span className={`rank-badge rank-${rank}`}>{rank}</span>;
}
