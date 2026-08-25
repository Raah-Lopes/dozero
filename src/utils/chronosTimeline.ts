import { getCalendarDateFromDayNumber, getCalendarDayNumber, type CalendarConfig } from './fantasyCalendar';

export type TimelineZoom = 'day' | 'month' | 'year';
export type TimelineDate = { day: number; month: number; year: number };

export interface TimelineBucket {
  key: string;
  label: string;
  date: TimelineDate;
}

const clampDate = (date: TimelineDate, config: CalendarConfig): TimelineDate => {
  const month = Math.min(config.months.length, Math.max(1, Math.round(date.month)));
  return {
    day: Math.min(config.months[month - 1].days, Math.max(1, Math.round(date.day))),
    month,
    year: Math.max(1, Math.round(date.year))
  };
};

export function moveTimelineDate(date: TimelineDate, zoom: TimelineZoom, amount: number, config: CalendarConfig): TimelineDate {
  const current = clampDate(date, config);
  if (zoom === 'day') {
    return getCalendarDateFromDayNumber(getCalendarDayNumber(current.day, current.month, current.year, config) + amount, config);
  }
  if (zoom === 'month') {
    const monthIndex = Math.max(0, (current.year - 1) * config.months.length + current.month - 1 + amount);
    const year = Math.floor(monthIndex / config.months.length) + 1;
    const month = monthIndex % config.months.length + 1;
    return clampDate({ ...current, month, year }, config);
  }
  return clampDate({ ...current, year: current.year + amount }, config);
}

export function placeTimelineDate(date: TimelineDate, target: TimelineDate, zoom: TimelineZoom, config: CalendarConfig): TimelineDate {
  if (zoom === 'day') return clampDate(target, config);
  if (zoom === 'month') return clampDate({ ...date, month: target.month, year: target.year }, config);
  return clampDate({ ...date, year: target.year }, config);
}

export function timelineBucketKey(date: TimelineDate, zoom: TimelineZoom) {
  if (zoom === 'year') return String(date.year);
  if (zoom === 'month') return `${date.year}-${date.month}`;
  return `${date.year}-${date.month}-${date.day}`;
}

export function buildTimelineBuckets(anchor: TimelineDate, zoom: TimelineZoom, offset: number, config: CalendarConfig): TimelineBucket[] {
  const radius = zoom === 'day' ? 7 : zoom === 'month' ? 6 : 4;
  const center = moveTimelineDate(anchor, zoom, offset, config);
  const seen = new Set<string>();

  return Array.from({ length: radius * 2 + 1 }, (_, index) => moveTimelineDate(center, zoom, index - radius, config))
    .map(date => {
      const key = timelineBucketKey(date, zoom);
      const monthName = config.months[date.month - 1]?.name || String(date.month);
      const label = zoom === 'year' ? `Ano ${date.year}` : zoom === 'month' ? `${monthName} ${date.year}` : `${date.day} ${monthName.slice(0, 3)}`;
      return { key, label, date };
    })
    .filter(bucket => !seen.has(bucket.key) && Boolean(seen.add(bucket.key)));
}
