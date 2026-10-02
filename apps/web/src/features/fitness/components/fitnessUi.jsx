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
          title={o.label}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.icon ? (
            <>
              {o.icon}
              {/* Hidden text so screen readers still read "Run" / "Ride" */}
              <span className="sr-only">{o.label}</span>
            </>
          ) : (
            o.label
          )}
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

// Import icon: arrow going down into a tray. Uses currentColor, so it matches the button text
export function ImportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}