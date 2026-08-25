import { describe, expect, it } from 'vitest';
import { CALENDAR_PRESETS } from './fantasyCalendar';
import { buildTimelineBuckets, moveTimelineDate, placeTimelineDate, timelineBucketKey } from './chronosTimeline';

const calendar = CALENDAR_PRESETS.fantasia;

describe('chronos timeline', () => {
  it('moves dates across fantasy month and year boundaries', () => {
    expect(moveTimelineDate({ day: 30, month: 12, year: 4 }, 'day', 1, calendar)).toEqual({ day: 1, month: 1, year: 5 });
    expect(moveTimelineDate({ day: 30, month: 12, year: 4 }, 'month', 1, calendar)).toEqual({ day: 30, month: 1, year: 5 });
  });

  it('preserves the precise date fields that are outside the active zoom', () => {
    expect(placeTimelineDate({ day: 30, month: 2, year: 4 }, { day: 1, month: 3, year: 8 }, 'year', calendar)).toEqual({ day: 30, month: 2, year: 8 });
    expect(placeTimelineDate({ day: 30, month: 2, year: 4 }, { day: 1, month: 3, year: 8 }, 'month', calendar)).toEqual({ day: 30, month: 3, year: 8 });
  });

  it('builds a navigable window with unique buckets around the anchor', () => {
    const buckets = buildTimelineBuckets({ day: 1, month: 1, year: 1 }, 'year', 0, calendar);
    expect(buckets.map(bucket => bucket.key)).toEqual(['1', '2', '3', '4', '5']);
    expect(timelineBucketKey({ day: 2, month: 3, year: 4 }, 'day')).toBe('4-3-2');
  });
});
