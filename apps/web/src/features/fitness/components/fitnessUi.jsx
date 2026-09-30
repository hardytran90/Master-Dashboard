// Small shared UI pieces for the dashboard panels.
import runIcon from '../../../assets/icons/run.png';
import rideIcon from '../../../assets/icons/ride.png';

const SPORT_ICONS = { run: runIcon, ride: rideIcon };

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

// Same PNG icons as Recent Activities, used as a mask so they take the accent color
export function SportIcon({ type }) {
  const icon = SPORT_ICONS[type] ?? runIcon;
  return (
    <span
      className="fx-glyph fx-sport-glyph"
      style={{ '--glyph': `url(${icon})` }}
      aria-hidden="true"
    />
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