/**
 * Countdown smoothing used by the Web Worker. Server estimates arrive every
 * few seconds and may jump; the displayed value counts down in real time
 * and glides towards the newest estimate instead of jumping.
 */

export interface CountdownState {
  displayedSeconds: number;
  targetSeconds: number;
  targetAt: number;
  initialised: boolean;
}

/** Fraction of the gap closed on every tick. */
export const SMOOTHING = 0.25;

export const initialCountdown = (): CountdownState => ({
  displayedSeconds: 0,
  targetSeconds: 0,
  targetAt: 0,
  initialised: false,
});

export function setTarget(state: CountdownState, minutes: number, now: number): CountdownState {
  const targetSeconds = Math.max(0, minutes * 60);
  return {
    displayedSeconds: state.initialised ? state.displayedSeconds : targetSeconds,
    targetSeconds,
    targetAt: now,
    initialised: true,
  };
}

export function tick(state: CountdownState, now: number): CountdownState {
  if (!state.initialised) {
    return state;
  }
  const target = Math.max(0, state.targetSeconds - (now - state.targetAt) / 1000);
  const elapsedDisplayed = Math.max(0, state.displayedSeconds - 1);
  const gap = target - elapsedDisplayed;
  const displayedSeconds =
    Math.abs(gap) <= 1 ? target : Math.max(0, elapsedDisplayed + gap * SMOOTHING);
  return { ...state, displayedSeconds };
}
