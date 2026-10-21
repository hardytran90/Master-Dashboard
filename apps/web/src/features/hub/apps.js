import { FitnessBody, CodingBody, BlogBody, BooksBody } from './cards';
import runIcon from '../../assets/icons/run.png';

// One entry per app in the Master Dashboard. Add a new app here and it shows up on the hub.
//   href      in-app route (react-router) — `external: true` = full-page link to a separate app
//   status    'live' | 'beta' | 'soon'   ('soon' cards are not clickable)
//   summary   key in GET /api/hub/summary  ·  Body = component that renders it
export const HUB_APPS = [
  {
    key: 'fitness', title: 'My Fitness', href: '/fitness', status: 'live',
    accent: '#FC4C02', icon: 'run', iconSrc: runIcon, summary: 'fitness', Body: FitnessBody,
    meta: (s) => (s?.stravaConnected ? 'Strava' : 'Manual & GPX'),
  },
  {
    key: 'coding', title: 'Coding Tracker', href: '/coding/', external: true, status: 'beta',
    accent: '#14B8A6', icon: 'code', summary: 'coding', Body: CodingBody,
    meta: (s) => (s?.connected ? 'WakaTime' : 'Not connected'),
  },
  {
    key: 'blog', title: 'My Blog', status: 'soon',
    accent: '#8B5CF6', icon: 'pen', summary: 'blog', Body: BlogBody,
  },
  {
    key: 'books', title: 'My Bookshelf', status: 'soon',
    accent: '#F59E0B', icon: 'book', summary: 'books', Body: BooksBody,
  },
];
