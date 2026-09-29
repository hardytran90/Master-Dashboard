export function Tabs({ options, value, onChange, label }) {
  return (
    <div className="fx-tabs" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="fx-tab"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PanelHead({ title, sub, children }) {
  return (
    <div className="fx-panel-head">
      <div>
        <h2 className="fx-title">{title}</h2>
        {sub && <div className="fx-sub">{sub}</div>}
      </div>
      {children && <div className="fx-panel-actions">{children}</div>}
    </div>
  );
}

export function SportIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (type === 'ride') {
    return (
      <svg {...common}>
        <circle cx="5.5" cy="16" r="3.5" />
        <circle cx="18.5" cy="16" r="3.5" />
        <path d="M5.5 16 9 9h6l3.5 7M9 9l3.5 7h-7M13.5 6H16" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 17.5h17.5a.5.5 0 0 0 .5-.5v-.6c0-1-.6-1.8-1.5-2.2L15 12l-2-4.5-2.5 1L9 6.5 6 8 4 12.5 3 15z" />
      <path d="M8.5 11.5 10 10.5M10 13l1.5-1" />
    </svg>
  );
}

export function SportLabel({ type, bar = false }) {
  return (
    <div className={`fx-sport ${bar ? 'fx-sport-bar' : ''}`}>
      <span className="fx-sport-icon">
        <SportIcon type={type} />
      </span>
      <span className="fx-sport-name">{type}</span>
    </div>
  );
}

export function Stat({ label, value }) {
  return (
    <div className="fx-stat">
      <div className="fx-stat-label">{label}</div>
      <div className="fx-stat-value">{value}</div>
    </div>
  );
}
