// ▲ 12% — arrow + number, so the direction never relies on color alone
export default function Delta({ value, suffix = '' }) {
  if (value == null) return <span className="ct-delta">no earlier data</span>;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  return (
    <span className={`ct-delta ct-delta-${dir}`}>
      <span aria-hidden="true">{arrow}</span> {Math.abs(value)}%{suffix}
      <span className="sr-only">{dir === 'up' ? ' more' : dir === 'down' ? ' less' : ' no change'}</span>
    </span>
  );
}
