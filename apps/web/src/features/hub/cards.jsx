import { Stat, Delta, Progress, MiniBars } from './HubWidgets';
import { hm, km, shortDate, delta, capitalize } from './format';

// Weekly distance goals are set on the My Fitness page (stored per browser).
function fitnessWeekGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem('fitness.goals.v1'));
    return { run: 25, ride: 10, ...(saved?.week || {}) };
  } catch {
    return { run: 25, ride: 10 };
  }
}


const SectionError = () => <p className="text-sm text-amber-300">Couldn’t load this summary.</p>;

export function FitnessBody({ data, accent }) {
  if (data.error) return <SectionError />;
  const goals = fitnessWeekGoals();
  const run = data.week.byType.run ?? { km: 0, sec: 0, count: 0 };
  const ride = data.week.byType.ride ?? { km: 0, sec: 0, count: 0 };
  const others = Object.entries(data.week.byType).filter(([t]) => t !== 'run' && t !== 'ride');

  return (
    <div className="space-y-5">
      <div>
        <p className="hub-stat-label">This week</p>
        <p className="hub-hero">{km(data.week.km)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
          <span>{hm(data.week.sec)} moving · {data.week.count} activities · {data.week.activeDays}/7 active days</span>
          <Delta value={delta(data.week.km, data.lastWeekToDate.km)} />
        </p>
      </div>

      <MiniBars title="Distance · last 7 days" days={data.last7} value={(d) => d.km}
        format={(v) => km(v)} color={accent} />

      <div className="space-y-3">
        <Progress label={`Run · ${run.count} this week`} value={run.km} goal={goals.run} format={(v) => km(v)} color={accent} />
        <Progress label={`Ride · ${ride.count} this week`} value={ride.km} goal={goals.ride} format={(v) => km(v)} color={accent} />
        {others.length > 0 && (
          <p className="text-xs text-slate-400">
            Also: {others.map(([t, s]) => `${capitalize(t)} ${s.count}× (${hm(s.sec)})`).join(' · ')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="This month" value={km(data.month.km, 0)} sub={`${data.month.count} activities`} />
        <Stat label="This year" value={km(data.year.km, 0)} sub={`${data.year.count} activities`} />
        <Stat label="Last activity"
          value={data.lastActivity ? km(data.lastActivity.km) : '—'}
          sub={data.lastActivity ? `${capitalize(data.lastActivity.type)} · ${shortDate(data.lastActivity.date)}` : 'None yet'} />
      </div>
    </div>
  );
}

export function CodingBody({ data, accent }) {
  if (data.error) return <SectionError />;
  if (!data.connected) {
    return (
      <div className="space-y-3">
        <p className="text-lg font-semibold text-white">WakaTime isn’t connected yet</p>
        <p className="text-sm text-slate-400">
          Open Coding Tracker to connect your WakaTime account. Your full coding history is imported
          automatically, then today’s time, weekly totals and streaks show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="hub-stat-label">Today</p>
          <p className="hub-hero">{hm(data.today)}</p>
        </div>
        <div>
          <p className="hub-stat-label">This week</p>
          <p className="hub-hero">{hm(data.week.sec)}</p>
        </div>
      </div>
      <p className="-mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
        <span>{data.week.activeDays}/7 days coded</span>
        <Delta value={delta(data.week.sec, data.lastWeekToDate.sec)} />
      </p>

      <Progress label="Daily goal" value={data.today} goal={data.dailyGoalSec ?? 3600} format={hm} color={accent} />

      <MiniBars title="Coding time · last 7 days" days={data.last7} value={(d) => d.sec}
        format={hm} color={accent} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Streak" value={`${data.streak} ${data.streak === 1 ? 'day' : 'days'}`} sub="in a row" />
        <Stat label="This month" value={hm(data.month.sec)} sub={`${data.month.activeDays} active days`} />
        <Stat label="Best day" value={data.bestDay ? hm(data.bestDay.sec) : '—'}
          sub={data.bestDay ? shortDate(data.bestDay.date) : 'last 12 months'} />
      </div>
    </div>
  );
}

export function BlogBody({ data }) {
  if (data.error) return <SectionError />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Published" value={data.published} />
        <Stat label="Drafts" value={data.drafts} />
      </div>
      <div>
        <p className="hub-stat-label">Latest post</p>
        <p className="mt-1 text-sm text-slate-200">
          {data.latest ? `${data.latest.title} · ${shortDate(data.latest.publishedAt?.slice(0, 10))}` : 'No posts yet'}
        </p>
      </div>
    </div>
  );
}

export function BooksBody({ data }) {
  if (data.error) return <SectionError />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Reading" value={data.readingCount} />
        <Stat label="To read" value={data.toRead} />
        <Stat label="Finished" value={data.finished} />
      </div>
      <div>
        <p className="hub-stat-label">Reading now</p>
        {data.reading.length
          ? <ul className="mt-1 space-y-1 text-sm text-slate-200">
              {data.reading.map((b) => <li key={b.title}>{b.title} <span className="text-slate-400">— {b.author}</span></li>)}
            </ul>
          : <p className="mt-1 text-sm text-slate-400">Nothing on the nightstand yet</p>}
      </div>
    </div>
  );
}
