import { beforeEach, describe, expect, it, vi } from 'vitest';
const { clocks, role } = vi.hoisted(() => ({ clocks: new Map(), role: { isGM: true } }));
vi.mock('../services/yjs', () => ({ state: { clocks } }));
vi.mock('./user', () => ({ useUserStore: { getState: () => role } }));
import { actOnMission, deleteMission, saveMission, transitionMission } from './missionClocks';
import type { TensionClock } from './clocks';
const steps = [0, 1, 2].map(i => ({ id: `${i}`, title: `Etapa ${i}`, objective: 'Salvar', consequence: 'Perigo', durationMs: 60000 }));
const initial = (): TensionClock => ({ id: 'test', x: 0, y: 0, label: 'Missão', durationMs: 60000, endTime: 0, pausedRemainingMs: 60000, isRunning: false, hpMod: '0', mpMod: '0', mission: { steps, current: 0, outcomes: [] } });
beforeEach(() => { clocks.clear(); role.isGM = true; });
describe('mission timeline', () => {
  it('preserves remaining time across pause and resume', () => {
    const started = transitionMission(initial(), 'start', 1000);
    const paused = transitionMission(started, 'pause', 11000);
    expect(paused.pausedRemainingMs).toBe(50000);
    expect(transitionMission(paused, 'start', 90000).endTime).toBe(140000);
  });
  it('expires only once after reconnect without skipping subsequent steps', () => {
    const started = transitionMission(initial(), 'start', 1000);
    const expired = transitionMission(started, 'expire', 9999999);
    expect(expired.mission).toMatchObject({ current: 1, outcomes: ['expired'] });
    expect(expired.isRunning).toBe(false);
    expect(transitionMission(expired, 'expire', 9999999)).toBe(expired);
  });
  it('records success before the deadline and failure at the exact deadline', () => {
    const started = transitionMission(initial(), 'start', 1000);
    expect(transitionMission(started, 'complete', 60999).mission?.outcomes).toEqual(['saved']);
    expect(transitionMission(started, 'complete', 61000).mission?.outcomes).toEqual(['expired']);
  });
  it('advances fictional time while paused, extends the deadline and completes the mission', () => {
    const extended = transitionMission(initial(), 'extend', 0);
    expect(extended.pausedRemainingMs).toBe(120000);
    const advanced = transitionMission(extended, 'advance', 0);
    expect(advanced.pausedRemainingMs).toBe(60000);
    let clock = transitionMission(advanced, 'advance', 0);
    clock = transitionMission(clock, 'complete', 0);
    clock = transitionMission(clock, 'complete', 0);
    expect(clock.mission?.outcomes).toEqual(['expired', 'saved', 'saved']);
    expect(clock.isRunning).toBe(false);
    expect(transitionMission(clock, 'start', 100)).toBe(clock);
    expect(transitionMission(clock, 'reset', 100)).toMatchObject({ pausedRemainingMs: 60000, mission: { current: 0, outcomes: [] } });
  });
  it('denies player writes and rejects invalid durations', () => {
    expect(saveMission('Missão', [{ ...steps[0], durationMs: NaN }])).toBe(false);
    role.isGM = false;
    expect(saveMission('Missão', steps)).toBe(false);
    clocks.set('test', initial());
    actOnMission('test', 'start');
    deleteMission('test');
    expect(clocks.get('test')).toEqual(initial());
  });
  it('creates a paused mission in the existing campaign clock map', () => {
    expect(saveMission('Missão', steps)).toBe(true);
    expect([...clocks.values()][0]).toMatchObject({ isRunning: false, mission: { current: 0, steps } });
  });
});
