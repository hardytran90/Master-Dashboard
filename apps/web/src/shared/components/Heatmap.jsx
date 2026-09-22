import { useEffect, useState, useMemo, useRef } from 'react';

// GitHub-style heatmap — shared across fitness / coding / books.
// Only receives data through props; it doesn't know whether the data is
// "running" or "coding hours".
//
// Props:
//   from, to       'YYYY-MM-DD' — date range to render (up to ~53 weeks)
//   data           { 'YYYY-MM-DD': { level: 1..4, tooltip: string } }
//                  a date missing from `data` = level 0 (gray cell)
//   colorScale     'green' | 'teal'
//   weekStartsOn   0 = Sunday (like GitHub), 1 = Monday
//   emptyTooltip   (dateKey) => string — tooltip for a cell with no data
//   lessLabel, moreLabel — labels at each end of the legend

const CELL = 12 // pixel
const GAP = 3;
const STEP = CELL + GAP;

const SCALES = { 
    green: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-emerald-200 dark:bg-emerald-900',
        'bg-emerald-400 dark:bg-emerald-700',
        'bg-emerald-600 dark:bg-emerald-500',
        'bg-emerald-800 dark:bg-emerald-400',
    ],
    teal: [
        'bg-gray-100 dark:bg-gray-800',
        'bg-teal-200 dark:bg-teal-900',
        'bg-teal-400 dark:bg-teal-700',
        'bg-teal-600 dark:bg-teal-500',
        'bg-teal-800 dark:bg-teal-400',
    ],
};

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const SHOWN_DAY_ROWS = [1, 3, 5, 7];

const pad = (n) => String(n).padStart(2, '0');
// Use 12:00 noon so the date doesn't shift when the timezone / DST changes
const parseKey = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
};
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function buildGrid(from, to, weekStartsOn) {
    const start = parseKey(from);
    const end = parseKey(to);

    // Roll back to the start of the week containing `from` so the first
    // column lines up correctly
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() - ((start.getDay() - weekStartsOn + 7) % 7));

    const weeks = [];
    while (cursor <= end) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(cursor >= start && cursor <= end ? toKey(cursor) : null);
            cursor.setDate(cursor.getDate() + 1);
        }
        weeks.push(week);
    }

    // Month labels: placed at the first column where the month changes
    const marks = [];
    let prevMonth = -1;
    weeks.forEach((week, w) => {
        const month = parseKey(week.find(Boolean)).getMonth();
        if (month != prevMonth) {
            marks.push({ w, month });
            prevMonth = month;
        }
    });
    // Drop labels crowded too close to the next one (< 3 columns) so the
    // text doesn't overlap
    const monthLabels = marks.filter((m, i) => !marks[i + 1] || marks[i + 1].w - m.w >= 3);

    return { weeks, monthLabels };
}

export default function Heatmap({
    from,
    to,
    data = {},
    colorScale = 'green',
    weekStartsOn = 0,
    emptyTooltip = (key) => key,
    lessLabel = "Less",
    moreLabel = "More",
}) {
    const scale = SCALES[colorScale] ?? SCALES.green;
    const { weeks, monthLabels } = useMemo(() => buildGrid(from, to, weekStartsOn),
        [from, to, weekStartsOn],
  );

    const [tip, setTip] = useState(null);
    const scrollRef = useRef(null);

    // Narrow screens: scroll to the right so the most recent days are visible
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [weeks.length]);

    const showTip = (e, text) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTip({ x: r.left + e.width / 2, y: r.top, text });
    };

    const gridWidth = weeks.length * STEP - GAP;

    return (
        <div>
            <div ref={scrollRef} className="overflow-x-auto pb-1" onScroll={() => setTip(null)}>
                {/* DAY-OF-WEEK LABELS */}
                <div
            className="grid text-[10px] leading-[12px] text-gray-500 dark:text-gray-400"
            style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, rowGap: GAP, paddingTop: 18 }}
          >
            {Array.from({ length: 7 }, (_, row) => {
              const dayIndex = (row + weekStartsOn) % 7;
              return <span key={row}>{SHOWN_DAY_ROWS.includes(dayIndex) ? DAY_LABELS[dayIndex] : ''}</span>;
            })}
          </div>

          <div>
            {/* MONTH LABELS */}
            <div
              className="relative mb-[3px] h-[15px] text-[10px] leading-[15px] text-gray-500 dark:text-gray-400"
              style={{ width: gridWidth }}
            >
              {monthLabels.map(({ w, month }) => (
                <span key={w} className="absolute" style={{ left: w * STEP }}>
                  {MONTH_LABELS[month]}
                </span>
              ))}
            </div>

            {/* Cell grid: flows column by column, 7 rows */}
            <div
              className="grid grid-flow-col"
              style={{
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: GAP,
              }}
            >
              {weeks.flatMap((week, w) =>
                week.map((key, row) => {
                  if (!key) return <div key={`${w}-${row}`} />; // outside the range, placeholder only
                  const entry = data[key];
                  const level = entry?.level ?? 0;
                  const text = entry?.tooltip ?? emptyTooltip(key);
                  return (
                    <div
                      key={key}
                      role="img"
                      aria-label={text}
                      className={`rounded-[2px] ring-1 ring-inset ring-black/5 dark:ring-white/5 ${scale[Math.min(level, 4)]}`}
                      onMouseEnter={(e) => showTip(e, text)}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="mr-1">{lessLabel}</span>
        {scale.map((c, i) => (
          <span key={i} className={`h-3 w-3 rounded-[2px] ring-1 ring-inset ring-black/5 dark:ring-white/5 ${c}`} />
        ))}
        <span className="ml-1">{moreLabel}</span>
      </div>

      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}