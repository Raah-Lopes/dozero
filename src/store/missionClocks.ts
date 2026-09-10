import { state } from '../services/yjs';
import { useUserStore } from './user';
import type { TensionClock } from './clocks';

export interface MissionStep { id: string; title: string; objective: string; consequence: string; durationMs: number }
export interface ClockMission { steps: MissionStep[]; current: number; outcomes: ('saved' | 'expired')[] }
export type MissionAction = 'start' | 'pause' | 'complete' | 'expire' | 'advance' | 'extend' | 'reset';
export const remainingTime = (clock: TensionClock, now: number) => Math.max(0, clock.isRunning ? clock.endTime - now : clock.pausedRemainingMs ?? clock.durationMs);

// Pure transitions: each deadline closes one stage and waits for the GM to start the next.
export function transitionMission(clock: TensionClock, action: MissionAction, now: number): TensionClock {
  const mission = clock.mission;
  if (!mission) return clock;
  if (action === 'reset') return { ...clock, mission: { ...mission, current: 0, outcomes: [] }, durationMs: mission.steps[0].durationMs, pausedRemainingMs: mission.steps[0].durationMs, endTime: 0, isRunning: false };
  if (mission.current >= mission.steps.length) return clock;
  const remaining = remainingTime(clock, now);
  if (action === 'expire' && (!clock.isRunning || remaining > 0)) return clock;
  if (action === 'complete' || action === 'expire' || ((action === 'advance') && remaining <= 60000)) {
    const outcome = action === 'complete' && remaining > 0 ? 'saved' : 'expired';
    const current = mission.current + 1;
    const durationMs = mission.steps[current]?.durationMs ?? 0;
    return { ...clock, mission: { ...mission, current, outcomes: [...mission.outcomes, outcome] }, isRunning: false, durationMs, pausedRemainingMs: durationMs, endTime: 0 };
  }
  if (action === 'start') return clock.isRunning ? clock : { ...clock, isRunning: true, endTime: now + remaining };
  if (action === 'pause') return { ...clock, isRunning: false, pausedRemainingMs: remaining };
  if (action === 'advance' || action === 'extend') {
    const next = Math.max(0, remaining + (action === 'extend' ? 60000 : -60000));
    return { ...clock, endTime: now + next, pausedRemainingMs: next, durationMs: action === 'extend' ? clock.durationMs + 60000 : clock.durationMs };
  }
  return clock;
}

export function saveMission(label: string, steps: MissionStep[]) {
  if (!useUserStore.getState().isGM) return false;
  if (!label.trim() || !steps.length || steps.length > 30 || steps.some(s => !s.title.trim() || !s.objective.trim() || !s.consequence.trim() || !Number.isFinite(s.durationMs) || s.durationMs < 1000 || s.durationMs > 86400000)) return false;
  const id = `mission_${crypto.randomUUID()}`;
  state.clocks.set(id, { id, label: label.trim(), x: 0, y: 0, durationMs: steps[0].durationMs, endTime: 0, pausedRemainingMs: steps[0].durationMs, isRunning: false, hpMod: '0', mpMod: '0', mission: { steps, current: 0, outcomes: [] } } satisfies TensionClock);
  return true;
}
export function actOnMission(id: string, action: MissionAction) {
  if (!useUserStore.getState().isGM) return;
  const clock = state.clocks.get(id) as TensionClock | undefined;
  if (!clock?.mission) return;
  const next = transitionMission(clock, action, Date.now());
  if (next !== clock) state.clocks.set(id, next);
}
export function deleteMission(id: string) {
  if (useUserStore.getState().isGM && (state.clocks.get(id) as TensionClock)?.mission) state.clocks.delete(id);
}
